-- 1. Create Telemetry Table
CREATE TABLE IF NOT EXISTS anonymous_diagnostic_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    brand TEXT,
    model TEXT,
    year INTEGER,
    protocol TEXT,
    ecu_id TEXT,
    dtc_codes TEXT[],
    session_hash TEXT UNIQUE,
    hit_count INTEGER DEFAULT 1,
    engine_rpm INTEGER,
    coolant_temp REAL,
    throttle_pos REAL
);

-- 2. Create Unique Index on session_hash
CREATE UNIQUE INDEX IF NOT EXISTS idx_telemetry_session_hash ON anonymous_diagnostic_telemetry(session_hash);

-- Enable RLS and insert-only policy for telemetry table
ALTER TABLE anonymous_diagnostic_telemetry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon telemetry insert only" ON anonymous_diagnostic_telemetry;
CREATE POLICY "Anon telemetry insert only"
    ON anonymous_diagnostic_telemetry
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 3. Create RPC function to handle upsert with hit_count incrementation
CREATE OR REPLACE FUNCTION upsert_telemetry(payload JSONB)
RETURNS VOID 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO anonymous_diagnostic_telemetry (
    created_at,
    brand, 
    model, 
    year, 
    protocol, 
    ecu_id, 
    dtc_codes, 
    session_hash, 
    engine_rpm, 
    coolant_temp, 
    throttle_pos, 
    hit_count
  )
  VALUES (
    COALESCE((payload->>'created_at')::timestamp with time zone, timezone('utc'::text, now())),
    payload->>'brand',
    payload->>'model',
    (payload->>'year')::integer,
    payload->>'protocol',
    payload->>'ecu_id',
    ARRAY(SELECT jsonb_array_elements_text(payload->'dtc_codes')),
    payload->>'session_hash',
    (payload->>'engine_rpm')::integer,
    (payload->>'coolant_temp')::real,
    (payload->>'throttle_pos')::real,
    1
  )
  ON CONFLICT (session_hash) DO UPDATE
  SET hit_count = anonymous_diagnostic_telemetry.hit_count + 1,
      created_at = COALESCE((payload->>'created_at')::timestamp with time zone, timezone('utc'::text, now())),
      engine_rpm = EXCLUDED.engine_rpm,
      coolant_temp = EXCLUDED.coolant_temp,
      throttle_pos = EXCLUDED.throttle_pos;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_chronic_faults(target_brand TEXT, limit_count INTEGER DEFAULT 3)
RETURNS TABLE (
    fault_code TEXT,
    unique_days_count BIGINT,
    total_occurrence BIGINT
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH exploded_dtcs AS (
        SELECT 
            unnested_dtc AS fault_code,
            hit_count,
            created_at::DATE AS record_date
        FROM anonymous_diagnostic_telemetry
        LEFT JOIN LATERAL unnest(dtc_codes) AS unnested_dtc ON TRUE
        WHERE brand = target_brand
    )
    SELECT 
        exploded_dtcs.fault_code,
        COUNT(DISTINCT record_date)::BIGINT AS unique_days_count,
        SUM(hit_count)::BIGINT AS total_occurrence
    FROM exploded_dtcs
    WHERE exploded_dtcs.fault_code IS NOT NULL AND exploded_dtcs.fault_code != ''
    GROUP BY exploded_dtcs.fault_code
    ORDER BY unique_days_count DESC, total_occurrence DESC 
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- 4. FIELD TELEMETRY & COMPATIBILITY ENGINE TABLES (FAZ 1-8)
-- =================================================================

-- 4.1 Primary Structured Connection Telemetry Table
CREATE TABLE IF NOT EXISTS public.connection_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    anon_user_id TEXT NOT NULL,
    app_version TEXT NOT NULL,
    platform TEXT NOT NULL,
    consent_version TEXT DEFAULT 'v1.0',
    vehicle JSONB NOT NULL,
    ecu_fingerprint JSONB NOT NULL,
    adapter JSONB NOT NULL,
    metrics JSONB NOT NULL,
    redacted_trace_log JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for session deduplication and analytical queries
CREATE INDEX IF NOT EXISTS idx_conn_telemetry_session_id ON public.connection_telemetry(session_id);
CREATE INDEX IF NOT EXISTS idx_conn_telemetry_wmi ON public.connection_telemetry(((vehicle->>'wmi')));
CREATE INDEX IF NOT EXISTS idx_conn_telemetry_status ON public.connection_telemetry(((metrics->>'status')));

-- RLS: Allow anonymous telemetry insertion, block public read/update/delete
ALTER TABLE public.connection_telemetry ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'connection_telemetry' AND policyname = 'Allow anonymous telemetry insert'
    ) THEN
        CREATE POLICY "Allow anonymous telemetry insert" ON public.connection_telemetry FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- 4.2 Unverified Device Telemetry Table (Dynamic Degradation Pool for Rooted Devices)
CREATE TABLE IF NOT EXISTS public.unverified_device_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    raw_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.unverified_device_telemetry ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'unverified_device_telemetry' AND policyname = 'Allow unverified telemetry insert'
    ) THEN
        CREATE POLICY "Allow unverified telemetry insert" ON public.unverified_device_telemetry FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- 4.3 RPC: Structurally insert connection telemetry payloads
CREATE OR REPLACE FUNCTION upsert_connection_telemetry(payload JSONB)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.connection_telemetry (
        session_id,
        anon_user_id,
        app_version,
        platform,
        consent_version,
        vehicle,
        ecu_fingerprint,
        adapter,
        metrics,
        redacted_trace_log,
        created_at
    )
    VALUES (
        COALESCE(payload->>'session_id', gen_random_uuid()::text),
        COALESCE(payload->>'anon_user_id', 'usr_anonymous'),
        COALESCE(payload->>'app_version', '1.0.0'),
        COALESCE(payload->>'platform', 'unknown'),
        COALESCE(payload->>'consent_version', 'v1.0'),
        COALESCE(payload->'vehicle', '{}'::jsonb),
        COALESCE(payload->'ecu_fingerprint', '{}'::jsonb),
        COALESCE(payload->'adapter', '{}'::jsonb),
        COALESCE(payload->'metrics', '{}'::jsonb),
        payload->'redacted_trace_log',
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.4 Compatibility Analytical Views for Admin Dashboard
CREATE OR REPLACE VIEW vw_adapter_compatibility_summary AS
SELECT 
    (adapter->>'claimed_name') AS adapter_model,
    (adapter->>'real_chip_type') AS chip_type,
    COUNT(*)::BIGINT AS total_sessions,
    COUNT(CASE WHEN (metrics->>'status') = 'SUCCESS' THEN 1 END)::BIGINT AS successful_sessions,
    ROUND((COUNT(CASE WHEN (metrics->>'status') = 'SUCCESS' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2) AS success_rate_pct
FROM public.connection_telemetry
GROUP BY (adapter->>'claimed_name'), (adapter->>'real_chip_type');

-- 4.5 GDPR Data Retention (18 Months Automatic Eviction via pg_cron if enabled)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'delete_old_telemetry_job',
            '0 3 * * *',
            $cron$ DELETE FROM public.connection_telemetry WHERE created_at < NOW() - INTERVAL '18 months'; $cron$
        );
    END IF;
END $$;

