-- =================================================================
-- MOTOCORTEX SUPABASE FULL PRODUCTION SCHEMA & SECURITY FIXES
-- =================================================================

-- 1. Create Telemetry Table
CREATE TABLE IF NOT EXISTS public.anonymous_diagnostic_telemetry (
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_telemetry_session_hash ON public.anonymous_diagnostic_telemetry(session_hash);

-- Enable RLS and insert-only policy for telemetry table
ALTER TABLE public.anonymous_diagnostic_telemetry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon telemetry insert only" ON public.anonymous_diagnostic_telemetry;
CREATE POLICY "Anon telemetry insert only"
    ON public.anonymous_diagnostic_telemetry
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Anon telemetry select all" ON public.anonymous_diagnostic_telemetry;
CREATE POLICY "Anon telemetry select all"
    ON public.anonymous_diagnostic_telemetry
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 3. Create RPC function to handle upsert with hit_count incrementation (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.upsert_telemetry(payload JSONB)
RETURNS VOID 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.anonymous_diagnostic_telemetry (
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

-- Chronic Faults Analytics Function
CREATE OR REPLACE FUNCTION public.get_chronic_faults(target_brand TEXT, limit_count INTEGER DEFAULT 3)
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
        FROM public.anonymous_diagnostic_telemetry
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
-- 4. FIELD TELEMETRY & CONNECTION DIAGNOSTICS
-- =================================================================

-- 4.1 Primary Structured Connection Telemetry Table
CREATE TABLE IF NOT EXISTS public.connection_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    anon_user_id TEXT NOT NULL,
    app_version TEXT NOT NULL,
    platform TEXT NOT NULL,
    consent_version TEXT DEFAULT 'v1.0',
    vehicle JSONB NOT NULL DEFAULT '{}'::jsonb,
    ecu_fingerprint JSONB NOT NULL DEFAULT '{}'::jsonb,
    adapter JSONB NOT NULL DEFAULT '{}'::jsonb,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    redacted_trace_log JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for session deduplication and analytical queries
CREATE INDEX IF NOT EXISTS idx_conn_telemetry_session_id ON public.connection_telemetry(session_id);
CREATE INDEX IF NOT EXISTS idx_conn_telemetry_created_at ON public.connection_telemetry(created_at DESC);

-- RLS: Allow anonymous telemetry insertion
ALTER TABLE public.connection_telemetry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous telemetry insert" ON public.connection_telemetry;
CREATE POLICY "Allow anonymous telemetry insert" 
    ON public.connection_telemetry 
    FOR INSERT 
    TO anon, authenticated 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous telemetry select" ON public.connection_telemetry;
CREATE POLICY "Allow anonymous telemetry select" 
    ON public.connection_telemetry 
    FOR SELECT 
    TO anon, authenticated 
    USING (true);

-- 4.2 Unverified Device Telemetry Table
CREATE TABLE IF NOT EXISTS public.unverified_device_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    raw_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.unverified_device_telemetry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow unverified telemetry insert" ON public.unverified_device_telemetry;
CREATE POLICY "Allow unverified telemetry insert" 
    ON public.unverified_device_telemetry 
    FOR INSERT 
    TO anon, authenticated 
    WITH CHECK (true);

-- 4.3 RPC: Structurally insert connection telemetry payloads (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.upsert_connection_telemetry(payload JSONB)
RETURNS VOID 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$ LANGUAGE plpgsql;

-- 4.4 Compatibility Analytical Views for Admin Dashboard
CREATE OR REPLACE VIEW public.vw_adapter_compatibility_summary AS
SELECT 
    (adapter->>'claimed_name') AS adapter_model,
    (adapter->>'real_chip_type') AS chip_type,
    COUNT(*)::BIGINT AS total_sessions,
    COUNT(CASE WHEN (metrics->>'status') = 'SUCCESS' THEN 1 END)::BIGINT AS successful_sessions,
    ROUND((COUNT(CASE WHEN (metrics->>'status') = 'SUCCESS' THEN 1 END)::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 2) AS success_rate_pct
FROM public.connection_telemetry
GROUP BY (adapter->>'claimed_name'), (adapter->>'real_chip_type');

-- =================================================================
-- 5. CLOUD FEATURE CODING BACKUPS TABLE & RLS
-- =================================================================
CREATE TABLE IF NOT EXISTS public.coding_backups (
    id TEXT PRIMARY KEY,
    vin TEXT,
    feature_id TEXT,
    feature_name TEXT,
    ecu_header TEXT,
    did_hex TEXT,
    original_payload TEXT,
    modified_payload TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coding_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon coding backups insert" ON public.coding_backups;
CREATE POLICY "Anon coding backups insert" 
    ON public.coding_backups 
    FOR INSERT 
    TO anon, authenticated 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Anon coding backups select" ON public.coding_backups;
CREATE POLICY "Anon coding backups select" 
    ON public.coding_backups 
    FOR SELECT 
    TO anon, authenticated 
    USING (true);

-- =================================================================
-- 6. APP LAUNCH & ORGANIC INSTALLATION HEARTBEAT
-- =================================================================
CREATE TABLE IF NOT EXISTS public.app_launches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anon_user_id TEXT NOT NULL,
    app_version TEXT,
    platform TEXT,
    device_model TEXT,
    os_version TEXT,
    locale TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_launches_created_at ON public.app_launches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_launches_anon_user ON public.app_launches(anon_user_id);

ALTER TABLE public.app_launches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon app launches insert" ON public.app_launches;
CREATE POLICY "Anon app launches insert" 
    ON public.app_launches 
    FOR INSERT 
    TO anon, authenticated 
    WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_app_launch(payload JSONB)
RETURNS VOID 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.app_launches (
        anon_user_id,
        app_version,
        platform,
        device_model,
        os_version,
        locale,
        created_at
    ) VALUES (
        COALESCE(payload->>'anon_user_id', gen_random_uuid()::text),
        payload->>'app_version',
        payload->>'platform',
        payload->>'device_model',
        payload->>'os_version',
        payload->>'locale',
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- 7. EXPLICIT PERMISSION GRANTS (NO PERMISSION DROPS)
-- =================================================================
REVOKE EXECUTE ON FUNCTION public.upsert_telemetry(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_telemetry(JSONB) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_chronic_faults(TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chronic_faults(TEXT, INTEGER) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.upsert_connection_telemetry(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_connection_telemetry(JSONB) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.log_app_launch(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_app_launch(JSONB) TO anon, authenticated, service_role;


