-- ==========================================================
-- ROYAL PLAZA HELPDESK - TICKET ENHANCEMENTS MIGRATION
-- ==========================================================

-- 1. NOTIFICATIONS SYSTEM
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'ASSIGNMENT', 'STATUS_CHANGE', 'COMMENT'
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    link TEXT, -- URL or ticket ID to navigate to
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. INTERNAL COMMENTS
CREATE TABLE IF NOT EXISTS public.ticket_comments (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    ticket_id TEXT REFERENCES public.tickets(id) ON DELETE CASCADE,
    author_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    author_name TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. DIAGNOSTIC TEMPLATES (Enhanced)
ALTER TABLE public.diagnostic_templates ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.diagnostic_templates ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.diagnostic_templates ADD COLUMN IF NOT EXISTS recommendations TEXT;

-- Migration from old text column if exists
UPDATE public.diagnostic_templates SET content = text, title = category || ' - Template' WHERE content IS NULL AND text IS NOT NULL;

-- 4. TICKET EXTENSIONS
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS reopening_reason TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS is_reopened BOOLEAN DEFAULT false;

-- 5. ATTACHMENTS
CREATE TABLE IF NOT EXISTS public.ticket_attachments (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    ticket_id TEXT REFERENCES public.tickets(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    uploaded_by TEXT REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. CLIENT COMMUNICATIONS
CREATE TABLE IF NOT EXISTS public.client_communications (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    ticket_id TEXT REFERENCES public.tickets(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'CALL', 'SMS', 'EMAIL', 'VISIT'
    summary TEXT NOT NULL,
    author_id TEXT REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. POLICIES (Update for new tables)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name FROM (VALUES 
            ('notifications'), 
            ('ticket_comments'), 
            ('diagnostic_templates'),
            ('ticket_attachments'),
            ('client_communications')
        ) AS t(table_name)
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all access" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Allow all access" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
