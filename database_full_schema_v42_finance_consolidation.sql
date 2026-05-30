-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v42 (DB CONSOLIDATION)
-- Adds RLS policies, missing indexes, and validates all
-- finance-related tables exist.
-- ==========================================================

-- ============ 1. ENSURE ALL TABLES EXIST ============

-- Cash Register Sessions (from v41)
CREATE TABLE IF NOT EXISTS public.cash_register_sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    status TEXT NOT NULL DEFAULT 'Ouverte' CHECK (status IN ('Ouverte', 'Fermée')),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE,
    opening_balance NUMERIC NOT NULL DEFAULT 0,
    closing_balance NUMERIC DEFAULT 0,
    total_theoretical NUMERIC DEFAULT 0,
    total_real NUMERIC DEFAULT 0,
    notes TEXT,
    opened_by TEXT,
    closed_by TEXT
);

-- Cash Register Entries / Journal (from v41)
CREATE TABLE IF NOT EXISTS public.cash_register_entries (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    session_id TEXT REFERENCES cash_register_sessions(id) ON DELETE CASCADE,
    ticket_id TEXT,
    type TEXT NOT NULL CHECK (type IN ('Acompte', 'Solde', 'Dépense', 'Ajustement')),
    amount NUMERIC NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('Espèces', 'Airtel Money', 'Moov Money', 'Virement', 'Carte')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recorded_by TEXT,
    notes TEXT
);

-- Workshop Expenses (from v39)
CREATE TABLE IF NOT EXISTS public.workshop_expenses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT NOT NULL,
    "recordedBy" TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fund Transfers (from v39)
CREATE TABLE IF NOT EXISTS public.fund_transfers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    amount NUMERIC NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'En attente' CHECK (status IN ('En attente', 'Validé', 'Rejeté')),
    "fromAgent" TEXT NOT NULL,
    "toManager" TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams (Agent self-organization)
CREATE TABLE IF NOT EXISTS public.teams (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name TEXT NOT NULL,
    description TEXT,
    "createdBy" TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ 2. INDEXES ============
CREATE INDEX IF NOT EXISTS idx_entries_session ON cash_register_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_entries_ticket ON cash_register_entries(ticket_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON workshop_expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_date ON fund_transfers(date DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON fund_transfers(status);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON cash_register_sessions(status);
CREATE INDEX IF NOT EXISTS idx_teams_creator ON teams("createdBy");

-- ============ 3. INVOICE SEQUENCE + FUNCTION ============
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1000;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    seq_val INT;
    year_val TEXT;
BEGIN
    SELECT nextval('invoice_seq') INTO seq_val;
    SELECT to_char(CURRENT_DATE, 'YYYY') INTO year_val;
    RETURN 'FAC-' || year_val || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ============ 4. ROW LEVEL SECURITY ============

-- Cash Sessions
ALTER TABLE public.cash_register_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.cash_register_sessions;
CREATE POLICY "Allow all for authenticated" ON public.cash_register_sessions
    FOR ALL USING (auth.role() = 'authenticated');

-- Cash Entries
ALTER TABLE public.cash_register_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.cash_register_entries;
CREATE POLICY "Allow all for authenticated" ON public.cash_register_entries
    FOR ALL USING (auth.role() = 'authenticated');

-- Workshop Expenses
ALTER TABLE public.workshop_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.workshop_expenses;
CREATE POLICY "Allow all for authenticated" ON public.workshop_expenses
    FOR ALL USING (auth.role() = 'authenticated');

-- Fund Transfers
ALTER TABLE public.fund_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.fund_transfers;
CREATE POLICY "Allow all for authenticated" ON public.fund_transfers
    FOR ALL USING (auth.role() = 'authenticated');

-- Teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.teams;
CREATE POLICY "Allow all for authenticated" ON public.teams
    FOR ALL USING (auth.role() = 'authenticated');

-- ============ 5. COMMENTS ============
COMMENT ON TABLE cash_register_sessions IS 'Sessions de caisse journalières avec fond initial et clôture';
COMMENT ON TABLE cash_register_entries IS 'Journal des encaissements liés aux tickets SAV';
COMMENT ON TABLE workshop_expenses IS 'Charges opérationnelles de l''atelier (salaires, loyers, etc.)';
COMMENT ON TABLE fund_transfers IS 'Transferts de fonds de la caisse vers coffre/banque';

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
