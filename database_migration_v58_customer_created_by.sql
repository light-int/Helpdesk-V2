-- Ajout de la colonne createdBy pour le filtrage des clients par agent
ALTER TABLE customers ADD COLUMN IF NOT EXISTS "createdBy" UUID REFERENCES auth.users(id);

-- Index pour accélérer le filtrage par créateur
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers("createdBy");
