-- Migration: Fix Schema for Caisse Module (Missing tables and columns)
-- Date: 2026-05-13
-- Version: v53

-- 1. Create the missing cash_registers table
CREATE TABLE IF NOT EXISTS public.cash_registers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    is_active BOOLEAN DEFAULT true,
    default_operator_id TEXT REFERENCES public.users(id),
    showroom TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add missing columns to cash_register_sessions
ALTER TABLE public.cash_register_sessions 
    ADD COLUMN IF NOT EXISTS cash_register_id TEXT REFERENCES public.cash_registers(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS cash_register_name TEXT,
    ADD COLUMN IF NOT EXISTS showroom TEXT,
    ADD COLUMN IF NOT EXISTS opened_by_name TEXT,
    ADD COLUMN IF NOT EXISTS closed_by_name TEXT,
    ADD COLUMN IF NOT EXISTS operator_id TEXT REFERENCES public.users(id),
    ADD COLUMN IF NOT EXISTS operator_name TEXT;

-- 3. Add missing columns to cash_register_entries
ALTER TABLE public.cash_register_entries 
    ADD COLUMN IF NOT EXISTS cash_register_id TEXT REFERENCES public.cash_registers(id),
    ADD COLUMN IF NOT EXISTS customer_name TEXT,
    ADD COLUMN IF NOT EXISTS recorded_by_name TEXT,
    ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS verified_by TEXT REFERENCES public.users(id),
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- 4. Enable RLS on cash_registers (just in case it was missed in v52)
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" 
ON public.cash_registers FOR SELECT USING (auth.role() = 'authenticated');

-- 5. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
