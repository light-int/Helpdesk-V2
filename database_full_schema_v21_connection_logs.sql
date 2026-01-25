
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v21 (HISTORIQUE ACCÈS)
-- ==========================================================

-- Table pour archiver chaque session de connexion
CREATE TABLE IF NOT EXISTS user_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb -- Pour stocker IP (simulée), Browser, OS
);

-- Indexation pour recherche rapide par utilisateur et date
CREATE INDEX IF NOT EXISTS idx_user_conn_uid ON user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_conn_time ON user_connections(timestamp);

-- RLS
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow Public Conn Logs" ON user_connections FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE user_connections IS 'Registre de sécurité Horizon - Historique des sessions collaborateurs.';
