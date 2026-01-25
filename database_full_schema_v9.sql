
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v9 (INTEGRITÉ ET CASCADE)
-- ==========================================================

-- S'assurer que les contraintes de suppression sont correctes pour éviter les erreurs de clés étrangères
-- Suppression et recréation de la contrainte sur les tickets si nécessaire

DO $$ 
BEGIN
    -- Suppression de la contrainte existante pour la recréer proprement
    ALTER TABLE IF EXISTS tickets DROP CONSTRAINT IF EXISTS tickets_customerId_fkey;
    
    -- Ajout de la contrainte avec CASCADE
    ALTER TABLE tickets 
    ADD CONSTRAINT tickets_customerId_fkey 
    FOREIGN KEY ("customerId") 
    REFERENCES customers(id) 
    ON DELETE CASCADE;

    -- Suppression de la contrainte technicien pour ON DELETE SET NULL
    ALTER TABLE IF EXISTS tickets DROP CONSTRAINT IF EXISTS tickets_assignedTechnicianId_fkey;
    
    ALTER TABLE tickets 
    ADD CONSTRAINT tickets_assignedTechnicianId_fkey 
    FOREIGN KEY ("assignedTechnicianId") 
    REFERENCES technicians(id) 
    ON DELETE SET NULL;
END $$;

-- Vérification de la table warranties (si elle n'est pas liée par ID, on ne peut pas cascader facilement, 
-- mais on s'assure qu'elle n'empêche pas la suppression)
