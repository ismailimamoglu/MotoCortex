-- 1. fault_codes Tablosu (Motosiklet & Otomobil Diagnostik Hata Kodları)
CREATE TABLE IF NOT EXISTS fault_codes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_code_category UNIQUE (code, category)
);

-- 2. vehicle_models Tablosu (Araç ve Motosiklet Marka/Model Verileri)
CREATE TABLE IF NOT EXISTS vehicle_models (
    id BIGSERIAL PRIMARY KEY,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    vehicle_type VARCHAR(20) NOT NULL, -- 'car' veya 'motorcycle'
    brand_logo_url VARCHAR(255) NULL,   -- Marka ikonları/logoları için nullable kolon
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_brand_model UNIQUE (brand, model)
);

-- 3. Performans ve Arama Hızlandırma İndeksleri
-- Hata kodlarında 'code' aramaları için B-Tree İndeksi
CREATE INDEX IF NOT EXISTS idx_fault_codes_code ON fault_codes (code);

-- Araç aramalarında 'brand' ve 'model' sorguları için B-Tree İndeksleri
CREATE INDEX IF NOT EXISTS idx_vehicle_models_brand ON vehicle_models (brand);
CREATE INDEX IF NOT EXISTS idx_vehicle_models_model ON vehicle_models (model);

-- 4. RLS (Row-Level Security) ve Salt-Okunur İzin Yapılandırması
ALTER TABLE fault_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read-only for fault_codes" ON fault_codes;
CREATE POLICY "Public read-only for fault_codes"
    ON fault_codes FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Public read-only for vehicle_models" ON vehicle_models;
CREATE POLICY "Public read-only for vehicle_models"
    ON vehicle_models FOR SELECT
    TO anon, authenticated
    USING (true);

REVOKE INSERT, UPDATE, DELETE ON fault_codes FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON vehicle_models FROM anon, authenticated;
