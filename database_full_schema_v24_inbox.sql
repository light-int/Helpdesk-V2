
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v24 (OMNICANAL & INBOX)
-- ==========================================================

-- 1. CONFIGURATION DES INTEGRATIONS
CREATE TABLE IF NOT EXISTS integration_configs (
    id TEXT PRIMARY KEY, -- 'whatsapp', 'messenger', 'email'
    name TEXT NOT NULL,
    enabled BOOLEAN DEFAULT false,
    api_key TEXT,
    webhook_url TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    last_sync TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. TABLES DES CONVERSATIONS (CRM INBOX)
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_avatar TEXT,
    source TEXT CHECK (source IN ('WhatsApp', 'Messenger', 'Email')) NOT NULL,
    last_message TEXT,
    unread_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open', -- 'open', 'resolved', 'archived'
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. TABLES DES MESSAGES
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type TEXT CHECK (sender_type IN ('client', 'agent', 'system')) NOT NULL,
    sender_name TEXT,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb, -- Pour stocker les URLs d'images ou fichiers
    status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'read'
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- INDEXATION
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_activity ON conversations(last_activity DESC);

-- RLS
ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only integration configs" ON integration_configs FOR ALL USING (true); -- Simplifié pour démo

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow Public Conversations Access" ON conversations FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow Public Messages Access" ON messages FOR ALL USING (true) WITH CHECK (true);

-- DONNÉES INITIALES DES CONNECTEURS
INSERT INTO integration_configs (id, name, enabled) VALUES 
('whatsapp', 'WhatsApp Business API', false),
('messenger', 'Facebook Messenger', false),
('email', 'Email Pro (SMTP/IMAP)', false)
ON CONFLICT (id) DO NOTHING;
