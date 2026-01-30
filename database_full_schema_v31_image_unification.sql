
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v31 (IMAGE UNIFICATION)
-- ==========================================================

-- 1. On s'assure que la colonne standard 'image' existe
ALTER TABLE products ADD COLUMN IF NOT EXISTS "image" TEXT;

-- 2. Si des données existent dans 'image_url' (v3), on les migre vers 'image'
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='image_url') THEN
        UPDATE products SET "image" = image_url WHERE "image" IS NULL;
    END IF;
END $$;

-- 3. On fait de même pour les techniciens (avatar vs avatar_url)
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS "avatar" TEXT;
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='technicians' AND column_name='avatar_url') THEN
        UPDATE technicians SET "avatar" = avatar_url WHERE "avatar" IS NULL;
    END IF;
END $$;

COMMENT ON TABLE products IS 'Catalogue Horizon v31 - Unification des visuels produits.';
