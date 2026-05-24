-- Migration: Enrichir les tables de caisse
-- Date: 2025-05-12
-- Description: Ajout de champs et contraintes pour le module caisse professionnel

-- 1. Ajouter showroom à cash_register_sessions
ALTER TABLE public.cash_register_sessions
ADD COLUMN IF NOT EXISTS showroom TEXT;

-- 2. Ajouter customer_name à cash_register_entries
ALTER TABLE public.cash_register_entries
ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- 3. Ajouter session_id à fund_transfers
ALTER TABLE public.fund_transfers
ADD COLUMN IF NOT EXISTS session_id TEXT REFERENCES public.cash_register_sessions(id) ON DELETE SET NULL;

-- 4. Ajouter contrainte UNIQUE sur (cash_register_id, status) WHERE status='Ouverte'
-- Cela garantit qu'une seule session ouverte par caisse physique
CREATE UNIQUE INDEX IF NOT EXISTS unique_open_session_per_cash_register
ON cash_register_sessions (cash_register_id)
WHERE status = 'Ouverte';

-- 5. Ajouter index pour améliorer les performances des requêtes courantes
CREATE INDEX IF NOT EXISTS idx_cash_register_sessions_status
ON cash_register_sessions (status);

CREATE INDEX IF NOT EXISTS idx_cash_register_sessions_opened_at
ON cash_register_sessions (opened_at DESC);

CREATE INDEX IF NOT EXISTS idx_cash_register_entries_session_id
ON cash_register_entries (session_id);

CREATE INDEX IF NOT EXISTS idx_cash_register_entries_timestamp
ON cash_register_entries (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_fund_transfers_session_id
ON fund_transfers (session_id);

-- 6. Ajouter showroom à cash_registers pour lier une caisse à un showroom
ALTER TABLE public.cash_registers
ADD COLUMN IF NOT EXISTS showroom TEXT;

-- 7. Ajouter contrainte de vérification pour les méthodes de paiement (déjà existante, mais renforçons)
ALTER TABLE public.cash_register_entries
DROP CONSTRAINT IF EXISTS cash_register_entries_method_check;

ALTER TABLE public.cash_register_entries
ADD CONSTRAINT cash_register_entries_method_check
CHECK (method IN ('Espèces', 'Airtel Money', 'Moov Money', 'Virement', 'Carte'));

-- 8. Ajouter colonne verification à cash_register_entries pour piste d'audit
ALTER TABLE public.cash_register_entries
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_by TEXT,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- 9. Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur cash_register_sessions si pas déjà présent
DROP TRIGGER IF EXISTS update_cash_register_sessions_updated_at ON cash_register_sessions;
CREATE TRIGGER update_cash_register_sessions_updated_at
    BEFORE UPDATE ON cash_register_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Notifier PostgREST pour rafraîchir le cache
NOTIFY pgrst, 'reload schema';
