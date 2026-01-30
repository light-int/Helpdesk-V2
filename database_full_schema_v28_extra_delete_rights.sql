
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v28 (ULTRA DELETE RIGHTS)
-- ==========================================================

-- Désactivation temporaire de RLS pour garantir que les droits ne sont pas corrompus
ALTER TABLE parts DISABLE ROW LEVEL SECURITY;

-- Recréation propre des politiques de suppression
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Access Parts" ON parts;
DROP POLICY IF EXISTS "Allow Delete Parts" ON parts;
DROP POLICY IF EXISTS "Every Action Possible" ON parts;

-- Politique universelle pour Horizon v2.8 (Usage interne simplifié)
CREATE POLICY "Every Action Possible" ON parts FOR ALL USING (true) WITH CHECK (true);

-- Vérification des clés étrangères pour les mouvements de stock
-- S'assure que ON DELETE CASCADE est toujours actif
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_stock_movements_parts_cascade'
    ) THEN
        ALTER TABLE stock_movements 
        ADD CONSTRAINT fk_stock_movements_parts_cascade 
        FOREIGN KEY ("partId") 
        REFERENCES parts(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

COMMENT ON TABLE parts IS 'Catalogue Horizon v28 - Droits de suppression universels actifs.';
