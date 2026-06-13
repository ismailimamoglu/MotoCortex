-- 1. Alter Telemetry Table: Remove wmi_vds and add float sensor snapshot PIDs
ALTER TABLE anonymous_diagnostic_telemetry DROP COLUMN IF EXISTS wmi_vds;

ALTER TABLE anonymous_diagnostic_telemetry 
ADD COLUMN IF NOT EXISTS engine_rpm INTEGER,
ADD COLUMN IF NOT EXISTS coolant_temp REAL,
ADD COLUMN IF NOT EXISTS throttle_pos REAL;

-- 2. Re-create or Replace RPC function to handle upsert with float/decimal values
CREATE OR REPLACE FUNCTION upsert_telemetry(payload JSONB)
RETURNS VOID AS $$
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
