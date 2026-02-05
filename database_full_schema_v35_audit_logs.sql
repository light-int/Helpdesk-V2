
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v35 (JOURNAL D'AUDIT)
-- ==========================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    "userId" TEXT REFERENCES users(id) ON DELETE SET NULL,
    "userName" TEXT,
    action TEXT NOT NULL,
    target TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    details TEXT
);

-- Indexation chronologique
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(timestamp DESC);

-- RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow Public Audit Access" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE audit_logs IS 'Journal centralisé des activités réseau Horizon Pro.';
