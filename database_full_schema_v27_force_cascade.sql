
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v27 (FORCE DELETE & RLS)
-- ==========================================================

-- 1. Nettoyage dynamique des contraintes de clés étrangères sur stock_movements
DO $$ 
DECLARE 
    constraint_name_record RECORD;
BEGIN 
    -- On cherche toutes les contraintes qui pointent vers la table 'parts'
    FOR constraint_name_record IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE confrelid = 'parts'::regclass 
    LOOP
        EXECUTE 'ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name_record.conname);
        RAISE NOTICE 'Suppression de la contrainte : %', constraint_name_record.conname;
    END LOOP;
END $$;

-- 2. Recréation de la contrainte avec CASCADE garanti
ALTER TABLE stock_movements 
ADD CONSTRAINT fk_stock_movements_parts_cascade 
FOREIGN KEY ("partId") 
REFERENCES parts(id) 
ON DELETE CASCADE;

-- 3. Mise à jour des politiques de sécurité (RLS)
-- On s'assure que la suppression est explicitement autorisée pour tout le monde (accès public Horizon)
DROP POLICY IF EXISTS "Public Access" ON parts;
CREATE POLICY "Public Access Parts" ON parts FOR ALL USING (true) WITH CHECK (true);

-- Parfois Supabase nécessite une politique DELETE séparée si ALL ne suffit pas
DROP POLICY IF EXISTS "Allow Delete Parts" ON parts;
CREATE POLICY "Allow Delete Parts" ON parts FOR DELETE USING (true);

COMMENT ON TABLE parts IS 'Catalogue des pièces Horizon v27 - Suppression en cascade et RLS Total Access.';
