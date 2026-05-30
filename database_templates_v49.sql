-- Migration v49: Document Templates for Quotations and Invoices

CREATE TABLE IF NOT EXISTS public.document_templates (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('QUOTATION', 'INVOICE', 'BOTH')),
    is_active BOOLEAN DEFAULT false,
    header_content TEXT,
    footer_content TEXT,
    terms_conditions TEXT,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#3ecf8e',
    font_family TEXT DEFAULT 'Inter',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- Allow all access for now (consistent with v46 consolidated logic)
DROP POLICY IF EXISTS "Allow all access" ON public.document_templates;
CREATE POLICY "Allow all access" ON public.document_templates FOR ALL USING (true) WITH CHECK (true);

-- Insert a default template
INSERT INTO public.document_templates (name, type, is_active, header_content, footer_content, terms_conditions, primary_color)
VALUES (
    'Template Standard', 
    'BOTH', 
    true, 
    'SAV et Vente de Matériels Informatiques', 
    'Merci de votre confiance. Visitez-nous sur www.royalplaza.ga',
    'Nos prix sont indiqués en FCFA. Validité du devis : 15 jours.',
    '#3ecf8e'
) ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
