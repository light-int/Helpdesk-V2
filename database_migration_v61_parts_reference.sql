-- ==========================================================
-- ROYAL PLAZA HELPDESK - MIGRATION v61
-- Ajout colonne "reference" (référence constructeur) à parts
-- ==========================================================

ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS "reference" TEXT;

COMMENT ON COLUMN public.parts."reference" IS 'Référence constructeur / OEM du fabricant';

CREATE INDEX IF NOT EXISTS idx_parts_reference ON public.parts("reference");
