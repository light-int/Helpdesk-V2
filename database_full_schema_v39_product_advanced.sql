
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v39 (PRODUCT ADVANCED)
-- ==========================================================

-- Ajout colonnes avancées à products
ALTER TABLE products ADD COLUMN IF NOT EXISTS "minStock" INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS "internalNotes" TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS "isFavorite" BOOLEAN DEFAULT false;

COMMENT ON COLUMN products."minStock" IS 'Seuil critique de stock pour alertes';
COMMENT ON COLUMN products."internalNotes" IS 'Notes internes visibles MANAGER/ADMIN uniquement';
COMMENT ON COLUMN products."isFavorite" IS 'Produit marqué comme favori';

-- Table historique des prix
CREATE TABLE IF NOT EXISTS product_price_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "productId" TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  "purchasePrice" NUMERIC,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "createdBy" TEXT
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON product_price_history("productId");
CREATE INDEX IF NOT EXISTS idx_price_history_date ON product_price_history("createdAt" DESC);

COMMENT ON TABLE product_price_history IS 'Historique des changements de prix et marges produits';
