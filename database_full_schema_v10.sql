
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v10 (RAPPORTS TECHNIQUES)
-- ==========================================================

-- Ajout du support pour les rapports d'intervention détaillés (actions et pièces)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS "interventionReport" JSONB DEFAULT '{}'::jsonb;

-- Commentaire descriptif pour la maintenance DB
COMMENT ON COLUMN tickets."interventionReport" IS 'Stocke les actions menées par le technicien et les pièces utilisées.';
