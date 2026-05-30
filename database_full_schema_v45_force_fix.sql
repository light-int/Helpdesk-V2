-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v45 (FORCE COLUMN FIX)
-- ==========================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. FORCE COLUMN RENAMING (CamelCase to snake_case)
DO $$
BEGIN
    -- Table workshop_expenses
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workshop_expenses' AND column_name = 'recordedBy') THEN
        ALTER TABLE public.workshop_expenses RENAME COLUMN "recordedBy" TO recorded_by;
    END IF;

    -- Table fund_transfers
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fund_transfers' AND column_name = 'fromAgent') THEN
        ALTER TABLE public.fund_transfers RENAME COLUMN "fromAgent" TO from_agent;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fund_transfers' AND column_name = 'toManager') THEN
        ALTER TABLE public.fund_transfers RENAME COLUMN "toManager" TO to_manager;
    END IF;

    -- Table teams
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'createdBy') THEN
        ALTER TABLE public.teams RENAME COLUMN "createdBy" TO created_by;
    END IF;

    -- Force Defaults for ID columns
    ALTER TABLE public.workshop_expenses ALTER COLUMN id SET DEFAULT uuid_generate_v4()::TEXT;
    ALTER TABLE public.fund_transfers ALTER COLUMN id SET DEFAULT uuid_generate_v4()::TEXT;
    ALTER TABLE public.teams ALTER COLUMN id SET DEFAULT uuid_generate_v4()::TEXT;
END $$;

-- 3. ENSURE ALL TABLES ARE CREATED IF MISSING (With correct columns)
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

-- 4. FIX RLS FOR ALL TABLES (Permissive for development)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all access" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Allow all access" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- 5. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
