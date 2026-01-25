
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v16 (SYNCHRO SHOWROOMS)
-- ==========================================================

-- S'assurer que la table showrooms a la colonne is_active au lieu de isOpen
-- pour respecter la convention de nommage SQL Snake Case et le mapping API.

ALTER TABLE showrooms ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Mise à jour des commentaires pour la maintenance
COMMENT ON COLUMN showrooms.is_active IS 'Définit si le point de vente est opérationnel et visible dans les listes.';
COMMENT ON COLUMN showrooms.hours IS 'Chaîne de caractères décrivant les horaires (ex: 08:30 - 18:30).';
