
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v19 (INTÉGRITÉ SUPPRESSION)
-- ==========================================================

-- Ajustement des rapports stratégiques pour autoriser la suppression de l'auteur
ALTER TABLE IF EXISTS strategic_reports 
DROP CONSTRAINT IF EXISTS strategic_reports_userId_fkey;

ALTER TABLE strategic_reports 
ADD CONSTRAINT strategic_reports_userId_fkey 
FOREIGN KEY ("userId") 
REFERENCES users(id) 
ON DELETE SET NULL;

-- S'assurer que le lien vers les showrooms ne bloque pas la suppression (même si c'est l'inverse normalement)
COMMENT ON TABLE users IS 'Registre des collaborateurs Horizon v19 - Support suppression définitive actif.';
