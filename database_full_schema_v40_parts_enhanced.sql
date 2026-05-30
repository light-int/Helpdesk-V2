-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v40 (PARTS ENHANCED)
-- ==========================================================

-- Ajout colonnes avancées à parts
ALTER TABLE parts ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS "reservedQuantity" INTEGER DEFAULT 0;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS "isKit" BOOLEAN DEFAULT false;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS "kitComponents" JSONB DEFAULT '[]';

COMMENT ON COLUMN parts."imageUrl" IS 'URL de la photo de la pièce';
COMMENT ON COLUMN parts."reservedQuantity" IS 'Quantité réservée pour tickets en cours';
COMMENT ON COLUMN parts."isKit" IS 'Indique si la pièce est un kit/assemblage';
COMMENT ON COLUMN parts."kitComponents" IS 'Liste des composants du kit (JSONB)';

-- Table fournisseurs par pièce
CREATE TABLE IF NOT EXISTS part_suppliers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "partId" TEXT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  "supplierName" TEXT NOT NULL,
  "supplierSku" TEXT,
  "purchasePrice" NUMERIC NOT NULL,
  "leadTimeDays" INTEGER DEFAULT 7,
  "isPreferred" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_part_suppliers_part ON part_suppliers("partId");

-- Table compatibilité pièces ↔ produits
CREATE TABLE IF NOT EXISTS part_compatibility (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "partId" TEXT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "productBrand" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_part_compat_part ON part_compatibility("partId");
CREATE INDEX IF NOT EXISTS idx_part_compat_product ON part_compatibility("productId");

-- Table réservations de stock
CREATE TABLE IF NOT EXISTS stock_reservations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "partId" TEXT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  "ticketId" TEXT NOT NULL,
  "ticketNumber" TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  "reservedAt" TIMESTAMPTZ DEFAULT NOW(),
  "reservedBy" TEXT
);

CREATE INDEX IF NOT EXISTS idx_stock_res_part ON stock_reservations("partId");
CREATE INDEX IF NOT EXISTS idx_stock_res_ticket ON stock_reservations("ticketId");

-- Table comptages inventaire physique
CREATE TABLE IF NOT EXISTS physical_inventory_counts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "partId" TEXT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  "countedQuantity" INTEGER NOT NULL,
  "expectedQuantity" INTEGER NOT NULL,
  difference INTEGER NOT NULL,
  "countedAt" TIMESTAMPTZ DEFAULT NOW(),
  "countedBy" TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_phys_inv_part ON physical_inventory_counts("partId");
CREATE INDEX IF NOT EXISTS idx_phys_inv_date ON physical_inventory_counts("countedAt" DESC);
