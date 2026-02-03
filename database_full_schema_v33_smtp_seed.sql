
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v33 (SMTP GATEWAY SEED)
-- ==========================================================

-- Insertion du connecteur SMTP s'il n'existe pas
INSERT INTO integration_configs (id, name, enabled, api_key, webhook_url, settings) 
VALUES (
    'smtp', 
    'SMTP Professional Relay', 
    false, 
    NULL, 
    'relais.royalplaza.ga', 
    '{
        "smtpHost": "smtp.royalplaza.ga",
        "smtpPort": "587",
        "smtpEncryption": "STARTTLS",
        "smtpUser": "notifications@royalplaza.ga",
        "serverRegion": "GABON-WEST"
    }'::jsonb
) 
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE integration_configs IS 'Configuration omnicanale v33 - Inclusion du relais SMTP système.';
