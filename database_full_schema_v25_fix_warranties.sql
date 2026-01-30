
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v25 (RESTAURATION WARRANTIES)
-- ==========================================================

CREATE TABLE IF NOT EXISTS warranties (
    id TEXT PRIMARY KEY,
    product TEXT NOT NULL,
    brand TEXT,
    "serialNumber" TEXT NOT NULL,
    "customerName" TEXT,
    "purchaseDate" TEXT,
    "durationMonths" INTEGER DEFAULT 12,
    "expiryDate" TEXT,
    "isExtensionAvailable" BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour la recherche par numéro de série
CREATE INDEX IF NOT EXISTS idx_warranties_sn ON warranties("serialNumber");

-- RLS
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow Public Warranties Access" ON warranties FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE warranties IS 'Registre des contrats de garantie pour le matériel Royal Plaza.';
