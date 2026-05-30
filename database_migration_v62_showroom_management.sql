-- ==========================================================
-- ROYAL PLAZA HELPDESK - MIGRATION v62
-- Gestion des showrooms et affectation des techniciens
-- ==========================================================

-- 1. Création de la table showrooms si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.showrooms (
  id text PRIMARY KEY,
  address text,
  phone text,
  hours text,
  is_active boolean DEFAULT true
);

-- 2. RLS : accès total pour les utilisateurs authentifiés
ALTER TABLE public.showrooms ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'showrooms_all' AND tablename = 'showrooms') THEN
    CREATE POLICY "showrooms_all" ON public.showrooms FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3. La colonne showroom de la table technicians (ajoutée en v22)
--    permet d'affecter un technicien à un showroom.
ALTER TABLE public.technicians ADD COLUMN IF NOT EXISTS "showroom" TEXT;

COMMENT ON COLUMN public.technicians."showroom" IS 'ID du showroom d''affectation du technicien (référence showrooms.id)';

-- 4. Index pour les requêtes de filtrage par showroom
CREATE INDEX IF NOT EXISTS idx_technicians_showroom ON public.technicians("showroom");
