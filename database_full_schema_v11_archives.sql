
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v11 (SYSTÈME D'ARCHIVAGE)
-- ==========================================================

-- Ajout de la colonne isArchived aux tables principales
ALTER TABLE IF EXISTS customers ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS tickets ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN DEFAULT false;

-- Indexation pour accélérer le filtrage des archives
CREATE INDEX IF NOT EXISTS idx_customers_archived ON customers("isArchived");
CREATE INDEX IF NOT EXISTS idx_tickets_archived ON tickets("isArchived");

-- Commentaire pour la maintenance
COMMENT ON COLUMN customers."isArchived" IS 'Définit si le client est supprimé logiquement (archivé).';
COMMENT ON COLUMN tickets."isArchived" IS 'Définit si le ticket appartient à un historique archivé.';
