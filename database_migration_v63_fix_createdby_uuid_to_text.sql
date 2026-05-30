-- ==========================================================
-- ROYAL PLAZA HELPDESK - MIGRATION v63
-- Fix: tickets.createdBy et customers.createdBy passent de UUID à TEXT
-- Les IDs générés par l'App sont au format "U-ADMIN-01", non UUID
-- ==========================================================

-- 1. Tickets : supprimer l'index, changer le type, recréer l'index
DROP INDEX IF EXISTS idx_tickets_created_by;
ALTER TABLE tickets ALTER COLUMN "createdBy" TYPE TEXT;
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets("createdBy");

-- 2. Customers : supprimer la FK (nom dynamique), l'index, changer le type, recréer
DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT con.conname INTO fk_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'customers'
    AND con.contype = 'f'
    AND con.confrelid = (SELECT oid FROM pg_class WHERE relname = 'users' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth'));
  
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE customers DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

DROP INDEX IF EXISTS idx_customers_created_by;
ALTER TABLE customers ALTER COLUMN "createdBy" TYPE TEXT;
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers("createdBy");
