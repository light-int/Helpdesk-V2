-- ==========================================================
-- ROYAL PLAZA HELPDESK - MIGRATION v64
-- Gestion des chauffeurs et affectations logistiques
-- ==========================================================

-- 1. Création de la table drivers (chauffeurs)
-- NOTE: les noms de colonnes sont en camelCase pour correspondre
--       aux conventions TypeScript du projet (cf. interface Driver)
CREATE TABLE IF NOT EXISTS public.drivers (
  id text PRIMARY KEY,
  name text NOT NULL,
  phone text,
  email text,
  "licenseNumber" text,
  status text DEFAULT 'Disponible',
  "vehicleId" text,
  created_at timestamptz DEFAULT now()
);

-- 2. RLS : accès total pour les utilisateurs authentifiés
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'drivers_all' AND tablename = 'drivers') THEN
    CREATE POLICY "drivers_all" ON public.drivers FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3. Index
CREATE INDEX IF NOT EXISTS idx_drivers_vehicle_id ON public.drivers("vehicleId");
CREATE INDEX IF NOT EXISTS idx_drivers_status ON public.drivers(status);
