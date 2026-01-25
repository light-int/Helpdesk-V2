
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v22 (AFFECTATION TECHNICIEN)
-- ==========================================================

-- Ajout de la colonne showroom à la table technicians pour alignement avec les comptes utilisateurs
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS "showroom" TEXT;

-- Commentaire pour documenter le champ
COMMENT ON COLUMN technicians."showroom" IS 'Nom du showroom d''affectation principale de l''expert technique.';

-- Mise à jour des techniciens existants si nécessaire (optionnel, basé sur les showrooms définis)
-- UPDATE technicians SET showroom = 'Glass' WHERE showroom IS NULL;
