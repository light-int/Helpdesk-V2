
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v30 (UNIFICATION FINALE)
-- ==========================================================

-- 1. Nettoyage et alignement de la table tickets
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS "productName" TEXT,
ADD COLUMN IF NOT EXISTS "serialNumber" TEXT,
ADD COLUMN IF NOT EXISTS "clientImpact" TEXT DEFAULT 'Faible',
ADD COLUMN IF NOT EXISTS "purchaseDate" TEXT,
ADD COLUMN IF NOT EXISTS "location" TEXT,
ADD COLUMN IF NOT EXISTS "brand" TEXT,
ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'WhatsApp',
ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN DEFAULT false;

-- 2. Alignement des types pour les statistiques Recharts
ALTER TABLE tickets ALTER COLUMN financials SET DEFAULT '{}'::jsonb;
ALTER TABLE tickets ALTER COLUMN "interventionReport" SET DEFAULT '{}'::jsonb;

-- 3. Robustesse des Techniciens
ALTER TABLE technicians 
ADD COLUMN IF NOT EXISTS "showroom" TEXT,
ADD COLUMN IF NOT EXISTS "performanceHistory" JSONB DEFAULT '[]'::jsonb;

-- 4. Contraintes de suppression sécurisées
ALTER TABLE stock_movements 
DROP CONSTRAINT IF EXISTS fk_stock_movements_parts_cascade;

ALTER TABLE stock_movements 
ADD CONSTRAINT fk_stock_movements_parts_cascade 
FOREIGN KEY ("partId") 
REFERENCES parts(id) 
ON DELETE CASCADE;

COMMENT ON TABLE tickets IS 'Registre SAV Horizon v30 - Schéma unifié et optimisé pour l''IA.';
