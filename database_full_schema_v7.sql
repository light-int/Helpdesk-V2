
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v7 (CONFIGURATION GLOBALE)
-- ==========================================================

CREATE TABLE IF NOT EXISTS system_config (
    id TEXT PRIMARY KEY DEFAULT 'GLOBAL',
    "aiEnabled" BOOLEAN DEFAULT true,
    "autoTranslate" BOOLEAN DEFAULT false,
    "sessionTimeout" INTEGER DEFAULT 240,
    "mfaRequired" BOOLEAN DEFAULT false,
    "syncFrequency" TEXT DEFAULT 'realtime',
    "maintenanceMode" BOOLEAN DEFAULT false,
    "passwordComplexity" TEXT DEFAULT 'medium',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insertion de la configuration par défaut si elle n'existe pas
INSERT INTO system_config (id) 
VALUES ('GLOBAL') 
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Config" ON system_config FOR ALL USING (true) WITH CHECK (true);
