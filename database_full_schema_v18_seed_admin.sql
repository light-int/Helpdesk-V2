
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v18 (SEEDING SÉCURITÉ)
-- ==========================================================

-- Insertion de l'administrateur principal si la table est vide
-- ou si cet ID n'existe pas encore.

INSERT INTO users (id, name, email, password, role, showroom, status, avatar)
VALUES (
    'U-ADMIN-001', 
    'Administrateur Système', 
    'admin@royalplaza.ga', 
    'intxxl', 
    'ADMIN', 
    'Glass', 
    'Actif', 
    'https://ui-avatars.com/api/?name=Admin+Horizon&background=1a73e8&color=ffffff'
)
ON CONFLICT (id) DO NOTHING;

-- S'assurer que l'email est unique pour le login
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_email_unique') THEN
        CREATE UNIQUE INDEX idx_users_email_unique ON users(email);
    END IF;
END $$;

COMMENT ON TABLE users IS 'Registre des collaborateurs Horizon avec accès synchronisé.';
