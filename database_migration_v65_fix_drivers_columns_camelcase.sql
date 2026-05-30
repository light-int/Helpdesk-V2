-- ==========================================================
-- ROYAL PLAZA HELPDESK - MIGRATION v65
-- Correction : renomme les colonnes snake_case en camelCase
-- dans la table drivers (créée en v64)
-- ==========================================================

-- Si la table a été créée avec license_number au lieu de "licenseNumber"
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'license_number') THEN
    ALTER TABLE public.drivers RENAME COLUMN license_number TO "licenseNumber";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'vehicle_id') THEN
    ALTER TABLE public.drivers RENAME COLUMN vehicle_id TO "vehicleId";
  END IF;
END $$;

-- Re-création des index si les noms ont changé
DROP INDEX IF EXISTS idx_drivers_vehicle_id;
CREATE INDEX IF NOT EXISTS idx_drivers_vehicle_id ON public.drivers("vehicleId");
