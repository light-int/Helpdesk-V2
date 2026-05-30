-- Migration: Ajout de la colonne 'quotation' à la table 'tickets'
-- Cette colonne stocke les données de cotation sous format JSONB

ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS quotation jsonb;

-- Commentaire sur la colonne
COMMENT ON COLUMN tickets.quotation IS 'Données de cotation (prestations, montant total, statut, etc.)';
