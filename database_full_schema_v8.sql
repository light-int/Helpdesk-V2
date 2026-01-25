
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v8 (COLONNES MANQUANTES)
-- ==========================================================

-- Ajout des colonnes utilisées dans l'interface mais absentes de la v5
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS "brand" TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS "purchaseDate" TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS "clientImpact" TEXT;

-- Indexation pour optimiser les recherches par zone ou marque
CREATE INDEX IF NOT EXISTS idx_tickets_brand ON tickets("brand");
CREATE INDEX IF NOT EXISTS idx_tickets_location ON tickets("location");
