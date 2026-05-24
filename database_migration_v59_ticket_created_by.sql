-- Ajout de la colonne createdBy pour le filtrage des tickets par agent
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS "createdBy" UUID;

-- Index pour accélérer le filtrage par créateur
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets("createdBy");
