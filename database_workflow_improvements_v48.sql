-- ==========================================================
-- ROYAL PLAZA HELPDESK - WORKFLOW IMPROVEMENTS MIGRATION v48
-- ==========================================================

-- 1. Add reopen_count column to tickets table
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS reopen_count INTEGER DEFAULT 0;

-- 2. Reload
NOTIFY pgrst, 'reload schema';
