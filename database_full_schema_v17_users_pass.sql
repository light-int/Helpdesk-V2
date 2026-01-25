
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v17 (SÉCURITÉ ACCÈS)
-- ==========================================================

-- Ajout de la colonne password à la table users
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS "password" TEXT;

-- Ajout d'un commentaire pour documenter le champ
COMMENT ON COLUMN users."password" IS 'Mot de passe en clair (version Horizon v1) ou hashé pour la persistance locale et cloud.';

-- Indexation optionnelle pour les emails si non déjà fait (v5 l'a fait mais en cas de pépin)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email);
