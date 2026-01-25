
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v13 (HISTORIQUE AUDITS)
-- ==========================================================

CREATE TABLE IF NOT EXISTS strategic_reports (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- Format HTML généré par Gemini + Marked
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "statsSnapshot" JSONB DEFAULT '{}'::jsonb,
    "userId" TEXT REFERENCES users(id) ON DELETE SET NULL
);

-- Indexation chronologique
CREATE INDEX IF NOT EXISTS idx_reports_created ON strategic_reports("createdAt");

-- RLS
ALTER TABLE strategic_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow Public Reports Access" ON strategic_reports FOR ALL USING (true) WITH CHECK (true);
