
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v38 (PRODUCT ENRICHMENT)
-- ==========================================================

-- Ajout des nouvelles colonnes à la table products
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS "purchasePrice" NUMERIC DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS "stockStatus" TEXT DEFAULT 'En stock';
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS "isDiscontinued" BOOLEAN DEFAULT false;

-- Contrainte sur stockStatus
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_stockstatus_check;
ALTER TABLE products ADD CONSTRAINT products_stockstatus_check CHECK ("stockStatus" IN ('En stock', 'Rupture', 'Sur commande'));

-- Index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(subcategory);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier);
CREATE INDEX IF NOT EXISTS idx_products_stockstatus ON products("stockStatus");
CREATE INDEX IF NOT EXISTS idx_products_active ON products("isActive") WHERE "isActive" = true;

COMMENT ON COLUMN products.subcategory IS 'Sous-catégorie pour affiner le filtrage';
COMMENT ON COLUMN products.description IS 'Description technique et spécifications';
COMMENT ON COLUMN products."purchasePrice" IS 'Prix d''achat pour calcul de marge';
COMMENT ON COLUMN products."stockStatus" IS 'État de disponibilité: En stock, Rupture, Sur commande';
COMMENT ON COLUMN products.supplier IS 'Fournisseur principal';
COMMENT ON COLUMN products."isActive" IS 'Produit actif dans le catalogue';
COMMENT ON COLUMN products."isDiscontinued" IS 'Produit arrêté / en fin de vie';
