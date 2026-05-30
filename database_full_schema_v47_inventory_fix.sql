-- ============================================================
-- INVENTORY SYSTEM — CORRECTIF FINAL (IDEMPOTENT)
-- ============================================================
-- Ce script gère à la fois :
-- - Les tables créées par v40_parts_enhanced.sql (quoted camelCase)
-- - Les tables créées par v43_unified.sql (unquoted lowercase)
-- - La présence ou l'absence de RLS
-- ============================================================

-- 1. AJOUT DES COLONNES MANQUANTES À LA TABLE parts
-- On tente les deux patterns de nommage
DO $$
BEGIN
    -- Pattern 1: quoted camelCase (v40)
    BEGIN
        ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not add "imageUrl" (maybe table has different schema)';
    END;
    BEGIN
        ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS "reservedQuantity" INTEGER DEFAULT 0;
    EXCEPTION WHEN OTHERS THEN END;
    BEGIN
        ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS "isKit" BOOLEAN DEFAULT false;
    EXCEPTION WHEN OTHERS THEN END;
    BEGIN
        ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS "kitComponents" JSONB DEFAULT '[]'::jsonb;
    EXCEPTION WHEN OTHERS THEN END;

    -- Pattern 2: lowercase unquoted (v43)
    BEGIN
        ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS imageurl TEXT;
    EXCEPTION WHEN OTHERS THEN END;
    BEGIN
        ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS reservedquantity INTEGER DEFAULT 0;
    EXCEPTION WHEN OTHERS THEN END;
    BEGIN
        ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS iskit BOOLEAN DEFAULT false;
    EXCEPTION WHEN OTHERS THEN END;
    BEGIN
        ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS kitcomponents JSONB DEFAULT '[]'::jsonb;
    EXCEPTION WHEN OTHERS THEN END;
END $$;

-- 2. CRÉATION DES NOUVELLES TABLES SI ELLES N'EXISTENT PAS
-- Pour correspondre au pattern v40 (quoted camelCase) qui est le plus complet
CREATE TABLE IF NOT EXISTS public.part_suppliers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "partId" TEXT NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
    "supplierName" TEXT NOT NULL,
    "supplierSku" TEXT,
    "purchasePrice" NUMERIC NOT NULL,
    "leadTimeDays" INTEGER DEFAULT 7,
    "isPreferred" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.part_compatibility (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "partId" TEXT NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productBrand" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.stock_reservations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "partId" TEXT NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
    "ticketId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    "reservedAt" TIMESTAMPTZ DEFAULT NOW(),
    "reservedBy" TEXT
);

CREATE TABLE IF NOT EXISTS public.physical_inventory_counts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "partId" TEXT NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
    "countedQuantity" INTEGER NOT NULL,
    "expectedQuantity" INTEGER NOT NULL,
    difference INTEGER NOT NULL,
    "countedAt" TIMESTAMPTZ DEFAULT NOW(),
    "countedBy" TEXT,
    notes TEXT
);

-- 3. INDEX POUR PERFORMANCE (Création sécurisée)
CREATE INDEX IF NOT EXISTS idx_part_suppliers_part ON public.part_suppliers("partId");
CREATE INDEX IF NOT EXISTS idx_part_compat_part ON public.part_compatibility("partId");
CREATE INDEX IF NOT EXISTS idx_part_compat_product ON public.part_compatibility("productId");
CREATE INDEX IF NOT EXISTS idx_stock_res_part ON public.stock_reservations("partId");
CREATE INDEX IF NOT EXISTS idx_stock_res_ticket ON public.stock_reservations("ticketId");
CREATE INDEX IF NOT EXISTS idx_phys_inv_part ON public.physical_inventory_counts("partId");
CREATE INDEX IF NOT EXISTS idx_phys_inv_date ON public.physical_inventory_counts("countedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_part ON public.stock_movements(partid);
CREATE INDEX IF NOT EXISTS idx_parts_sku ON public.parts(sku);

-- 4. ROW LEVEL SECURITY POUR TOUTES LES TABLES
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not enable RLS on %', t;
        END;
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS "Allow all access" ON public.%I', t);
            EXECUTE format('CREATE POLICY "Allow all access" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not set policy on %', t;
        END;
    END LOOP;
END $$;

-- 5. NOTIFIER LE RECLADAGE POSTGREST
NOTIFY pgrst, 'reload schema';