-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v46 (CONSOLIDATED FINAL)
-- ==========================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CORE TABLES - TECHNICAL & CONFIG
CREATE TABLE IF NOT EXISTS public.teams (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    name TEXT NOT NULL,
    description TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. FINANCIAL MODULE - CASH REGISTER
CREATE TABLE IF NOT EXISTS public.cash_register_sessions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    status TEXT DEFAULT 'Ouverte' CHECK (status IN ('Ouverte', 'Fermée')),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    opening_balance NUMERIC DEFAULT 0,
    closing_balance NUMERIC,
    total_theoretical NUMERIC,
    total_real NUMERIC,
    notes TEXT,
    opened_by TEXT,
    closed_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cash_register_entries (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    session_id TEXT REFERENCES public.cash_register_sessions(id) ON DELETE CASCADE,
    ticket_id TEXT,
    type TEXT CHECK (type IN ('Acompte', 'Solde', 'Dépense', 'Ajustement')),
    amount NUMERIC NOT NULL,
    method TEXT CHECK (method IN ('Espèces', 'Airtel Money', 'Moov Money', 'Virement', 'Carte')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recorded_by TEXT,
    notes TEXT
);

-- 4. FINANCIAL MODULE - EXPENSES & TRANSFERS
CREATE TABLE IF NOT EXISTS public.workshop_expenses (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT NOT NULL,
    recorded_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fund_transfers (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    amount NUMERIC NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'En attente' CHECK (status IN ('En attente', 'Validé', 'Rejeté')),
    from_agent TEXT NOT NULL,
    to_manager TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. RPC FUNCTIONS
-- Sequence for invoices
CREATE SEQUENCE IF NOT EXISTS invoice_num_seq START 1;

DROP FUNCTION IF EXISTS public.generate_invoice_number();

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS INTEGER AS $$
DECLARE
    next_val INTEGER;
BEGIN
    SELECT nextval('invoice_num_seq')::INTEGER INTO next_val;
    RETURN next_val;
END;
$$ LANGUAGE plpgsql;

-- 6. SECURITY - RLS POLICIES (Development Mode)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all access" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Allow all access" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- 7. RELOAD
NOTIFY pgrst, 'reload schema';
