
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v29 (FULL SYNC)
-- ==========================================================

-- Ajout/Vérification de toutes les colonnes nécessaires au formulaire détaillé
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS "brand" TEXT,
ADD COLUMN IF NOT EXISTS "purchaseDate" TEXT,
ADD COLUMN IF NOT EXISTS "location" TEXT,
ADD COLUMN IF NOT EXISTS "clientImpact" TEXT DEFAULT 'Faible',
ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'WhatsApp',
ADD COLUMN IF NOT EXISTS "productName" TEXT,
ADD COLUMN IF NOT EXISTS "serialNumber" TEXT,
ADD COLUMN IF NOT EXISTS "interventionReport" JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN DEFAULT false;

-- Nettoyage des types de colonnes pour plus de flexibilité
ALTER TABLE tickets ALTER COLUMN "source" TYPE TEXT;
ALTER TABLE tickets ALTER COLUMN "showroom" TYPE TEXT;
ALTER TABLE tickets ALTER COLUMN "category" TYPE TEXT;
ALTER TABLE tickets ALTER COLUMN "status" TYPE TEXT;
ALTER TABLE tickets ALTER COLUMN "priority" TYPE TEXT;

COMMENT ON TABLE tickets IS 'Registre SAV Horizon v29 - Synchronisation complète avec le formulaire détaillé.';
