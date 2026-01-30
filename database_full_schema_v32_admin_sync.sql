
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v32 (ADMIN SYNC)
-- ==========================================================

-- Enrichissement de la configuration système
ALTER TABLE system_config 
ADD COLUMN IF NOT EXISTS "aiModel" TEXT DEFAULT 'flash',
ADD COLUMN IF NOT EXISTS "aiAutoCategorization" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "aiStrategicAudit" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "aiChatbotEnabled" BOOLEAN DEFAULT true;

-- Mise à jour de la ligne globale par défaut
UPDATE system_config 
SET "aiModel" = 'flash', 
    "aiAutoCategorization" = true, 
    "aiStrategicAudit" = true, 
    "aiChatbotEnabled" = true
WHERE id = 'GLOBAL';

COMMENT ON TABLE system_config IS 'Configuration maîtresse de l''intelligence Horizon et de la sécurité.';
