
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v26 (CASCADE INTEGRITY)
-- ==========================================================

-- On s'assure que la table stock_movements autorise la suppression en cascade
-- Cela permet de supprimer une pièce même si elle a un historique de mouvements.

DO $$ 
BEGIN
    -- Suppression de l'ancienne contrainte si elle existe
    ALTER TABLE IF EXISTS stock_movements DROP CONSTRAINT IF EXISTS stock_movements_partId_fkey;

    -- Recréation avec CASCADE
    ALTER TABLE stock_movements 
    ADD CONSTRAINT stock_movements_partId_fkey 
    FOREIGN KEY ("partId") 
    REFERENCES parts(id) 
    ON DELETE CASCADE;

EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table stock_movements non trouvée, migration ignorée.';
END $$;

COMMENT ON CONSTRAINT stock_movements_partId_fkey ON stock_movements IS 'Permet la suppression d''une pièce et de son historique de stock associé.';
