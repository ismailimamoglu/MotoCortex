# Supabase API Gateway & Database Rate Limiting Configuration Guide

To prevent Denial of Service (DOS) attacks and prevent clients from abusing anon endpoints (such as `upsert_telemetry`), you can implement Rate Limiting at the API Gateway level (Kong), the Database layer, or via an Edge Function.

---

## 1. Gateway Level Configuration (Kong API Gateway)

Supabase uses **Kong** under the hood as its main API Gateway router.

### A. Local Development & Self-Hosted Configuration
To enable the Kong Rate-Limiting plugin locally or in a self-hosted docker deployment, add the rate limiting configuration to your `volumes/api/kong.yml` file:

```yaml
plugins:
  - name: rate-limiting
    config:
      minute: 30
      policy: local
      limit_by: ip
      fault_tolerant: true
```

Restart the docker services to apply the configuration:
```bash
docker compose restart kong
```

### B. Managed Cloud Platform (Cloudflare WAF / Kong Admin API)
For Supabase Cloud:
1. **Cloudflare WAF (Recommended)**: Set up a free Cloudflare proxy in front of your Supabase URL `https://your-project.supabase.co` and create a WAF Rate Limiting rule:
   - **URI Path** equals `/rest/v1/rpc/upsert_telemetry`
   - **Action**: Block / Rate Limit (Block if request rate exceeds 30 requests per 1 minute per IP).
2. **Support Request**: Submit a request in the Supabase Dashboard to enable Kong custom rate limiting for the anon role on specific RPC routes.

---

## 2. Database Level Rate Limiting (PL/pgSQL Trigger)

You can enforce rate limits directly inside the PostgreSQL database. This acts as a robust fail-safe.
Create a table to track IP access and verify request limits inside the `upsert_telemetry` RPC function.

### A. Run SQL Migration
Copy and run the following script in the Supabase **SQL Editor**:

```sql
-- Table to track API request stamps by IP
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
    ip_address TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    last_request TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    request_count INT DEFAULT 1 NOT NULL,
    PRIMARY KEY (ip_address, endpoint)
);

-- Index to optimize rate check queries
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_ip ON public.api_rate_limits(ip_address, endpoint);

-- PL/pgSQL Function to check and enforce rate limit (max 30 requests per minute)
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_endpoint TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_ip TEXT;
    v_last_req TIMESTAMP WITH TIME ZONE;
    v_count INT;
    v_limit CONSTANT INT := 30; -- Max 30 requests
    v_window_seconds CONSTANT INT := 60; -- 1 minute window
BEGIN
    -- Extract client IP address from Supabase request headers
    v_ip := COALESCE(
        current_setting('request.headers', true)::json->>'x-forwarded-for',
        current_setting('request.headers', true)::json->>'x-real-ip',
        'unknown_ip'
    );

    -- Clean up ancient records older than the sliding window
    DELETE FROM public.api_rate_limits WHERE last_request < now() - (v_window_seconds || ' seconds')::INTERVAL;

    -- Fetch or initialize rate limit record
    SELECT last_request, request_count INTO v_last_req, v_count
    FROM public.api_rate_limits
    WHERE ip_address = v_ip AND endpoint = p_endpoint;

    IF NOT FOUND THEN
        -- Insert new tracker record
        INSERT INTO public.api_rate_limits (ip_address, endpoint, last_request, request_count)
        VALUES (v_ip, p_endpoint, now(), 1);
        RETURN TRUE;
    ELSE
        IF v_count >= v_limit THEN
            -- Limit exceeded, throw 429 Too Many Requests response
            RAISE EXCEPTION 'Too Many Requests: Rate limit exceeded (Max 30 requests per minute).'
                USING ERRCODE = 'P0001', DETAIL = 'rate_limit_exceeded';
        ELSE
            -- Increment request counter
            UPDATE public.api_rate_limits
            SET request_count = request_count + 1,
                last_request = now()
            WHERE ip_address = v_ip AND endpoint = p_endpoint;
            RETURN TRUE;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### B. Enforce in `upsert_telemetry` RPC
Modify your existing `upsert_telemetry` function to check the rate limit before execution:

```sql
CREATE OR REPLACE FUNCTION public.upsert_telemetry(payload JSONB)
RETURNS VOID AS $$
BEGIN
    -- Perform rate check. If limit is exceeded, an exception is thrown automatically
    PERFORM public.check_rate_limit('upsert_telemetry');

    -- Your existing upsert code goes here
    -- e.g. INSERT INTO public.anonymous_diagnostic_telemetry (...) VALUES (...)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
