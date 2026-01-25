
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v12 (FLUIDITÉ CATALOGUE)
-- ==========================================================

-- Désactivation des contraintes bloquantes pour les produits
-- On s'assure que si un produit est supprimé du catalogue, 
-- le ticket SAV garde la trace textuelle mais le lien est mis à NULL.

DO $$ 
BEGIN
    -- Suppression de la contrainte si elle existe sous l'ancien nom
    ALTER TABLE IF EXISTS tickets DROP CONSTRAINT IF EXISTS tickets_product_reference_fkey;
    ALTER TABLE IF EXISTS tickets DROP CONSTRAINT IF EXISTS tickets_productReference_fkey;

    -- Ajout d'une nouvelle contrainte souple
    -- Note : La référence dans les tickets pointe souvent sur le champ 'reference' du produit
    -- plutot que sur l'ID technique UUID.
    ALTER TABLE tickets 
    ADD CONSTRAINT tickets_product_reference_link 
    FOREIGN KEY ("productReference") 
    REFERENCES products(reference) 
    ON DELETE SET NULL;

EXCEPTION
    WHEN undefined_column THEN 
        RAISE NOTICE 'Colonne productReference absente, saut de la contrainte.';
    WHEN undefined_table THEN
        RAISE NOTICE 'Table non existante, migration ignorée.';
END $$;

COMMENT ON CONSTRAINT tickets_product_reference_link ON tickets IS 'Permet la suppression du produit du catalogue sans supprimer les tickets associés.';
