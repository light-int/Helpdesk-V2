
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v34 (SMTP GATEWAY INITIALIZATION)
-- ==========================================================

-- S'assurer que le champ settings est capable de stocker les nouvelles clés SMTP
-- On insère le connecteur SMTP s'il n'existe pas déjà.
INSERT INTO integration_configs (id, name, enabled, api_key, webhook_url, settings) 
VALUES (
    'smtp', 
    'SMTP Email Gateway', 
    false, 
    NULL, 
    'smtp.royalplaza.ga', 
    '{
        "smtpHost": "smtp.royalplaza.ga",
        "smtpPort": "587",
        "smtpEncryption": "STARTTLS",
        "smtpUser": "notifications@royalplaza.ga",
        "smtpPass": "",
        "serverRegion": "GABON-WEST"
    }'::jsonb
) 
ON CONFLICT (id) DO UPDATE 
SET name = 'SMTP Email Gateway',
    webhook_url = EXCLUDED.webhook_url,
    settings = integration_configs.settings || EXCLUDED.settings;

-- Commentaire de versioning
COMMENT ON TABLE integration_configs IS 'Registre des connecteurs v34 - Inclusion du relais de messagerie SMTP certifié.';
