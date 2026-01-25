
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v20 (ALIGNEMENT SYNC)
-- ==========================================================

-- Ajout des colonnes absentes qui provoquaient l'échec de l'insertion
ALTER TABLE users ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMP WITH TIME ZONE;

-- S'assurer que showroom est bien de type TEXT (v5) et non showroom_type (v2) pour la flexibilité
ALTER TABLE users ALTER COLUMN showroom TYPE TEXT;

-- Ajout d'un commentaire pour documenter la v20
COMMENT ON TABLE users IS 'Registre des collaborateurs Horizon v20 - Support MFA et LastLogin actif.';
