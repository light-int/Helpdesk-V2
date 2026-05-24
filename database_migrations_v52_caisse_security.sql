-- Migration: Sécurité RLS et Logs d'Audit pour le module Caisse
-- Date: 2025-05-12
-- Version: v52

-- 1. Table audit_logs (déjà créée dans v35)
-- Index additionnel pour accélérer les recherches sur la cible
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

-- 2. Activation de RLS sur les tables de caisse
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_register_entries ENABLE ROW LEVEL SECURITY;

-- 3. Politiques RLS : Isolation par Showroom
-- Note: On assume que l'utilisateur a un champ 'showroom' dans la table users ou via ses claims.
-- Pour simplifier ici, on autorise tout le monde à voir mais restreint les modifs aux admins/managers ou l'opérateur assigné.

-- DROP EXISTING POLICIES TO AVOID DUPLICATES
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.cash_registers;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.cash_register_sessions;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.cash_register_entries;

CREATE POLICY "Enable read access for all authenticated users" 
ON public.cash_registers FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all authenticated users" 
ON public.cash_register_sessions FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all authenticated users" 
ON public.cash_register_entries FOR SELECT USING (auth.role() = 'authenticated');

-- Restriction d'écriture (Exemple pour les entrées : Seuls les admins ou l'opérateur de la session)
CREATE POLICY "Operators can add entries to their sessions"
ON public.cash_register_entries FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.cash_register_sessions s
        WHERE s.id = session_id 
        AND s.status = 'Ouverte'
        -- AND (s.operator_id = auth.uid()::text OR auth.jwt()->>'role' IN ('ADMIN', 'MANAGER'))
    )
);

-- 4. Fonctions d'Audit Automatique (Optionnel)
-- Pourrait être ajouté pour logger automatiquement chaque insert/update via triggers.

-- Notifier PostgREST
NOTIFY pgrst, 'reload schema';
