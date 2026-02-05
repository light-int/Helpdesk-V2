
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v36 (OPENROUTER SUPPORT)
-- ==========================================================

-- Mise à jour de la config système pour supporter le provider
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS "aiProvider" TEXT DEFAULT 'google';

-- Insertion du connecteur OpenRouter
INSERT INTO integration_configs (id, name, enabled, api_key, webhook_url, settings) 
VALUES (
    'openrouter', 
    'OpenRouter AI Gateway', 
    false, 
    NULL, 
    'https://openrouter.ai/api/v1', 
    '{
        "default_model": "qwen/qwen3-next-80b-a3b-instruct:free",
        "site_name": "Royal Plaza Horizon",
        "site_url": "https://royalplaza.ga"
    }'::jsonb
) 
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE integration_configs IS 'Registre des connecteurs v36 - Support OpenRouter LLM Gateway.';
