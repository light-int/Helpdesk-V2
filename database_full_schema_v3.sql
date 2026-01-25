
-- ==========================================================
-- ROYAL PLAZA HELPDESK - ARCHITECTURE "WORKFLOW ENGINE" v3
-- ==========================================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TYPES ÉNUMÉRÉS (LOGIQUE OPÉRATIONNELLE GABON)
DO $$ BEGIN
    -- Rôles et accès
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('ADMIN', 'TECHNICIAN', 'AGENT', 'MANAGER');
    END IF;
    
    -- États du workflow SAV (Ref: Documentation.tsx)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
        CREATE TYPE ticket_status AS ENUM ('Nouveau', 'Diagnostic IA', 'En cours', 'En attente d''approbation', 'Intervention Terrain', 'Résolu', 'Fermé');
    END IF;

    -- Priorités SLA
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority') THEN
        CREATE TYPE ticket_priority AS ENUM ('Basse', 'Moyenne', 'Haute', 'Urgent');
    END IF;

    -- Catégories de services
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_category') THEN
        CREATE TYPE ticket_category AS ENUM ('Livraison', 'Installation', 'SAV', 'Remboursement', 'Maintenance', 'Climatisation', 'Électronique');
    END IF;

    -- Origine omnicanale (Ref: Settings.tsx)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'source_type') THEN
        CREATE TYPE source_type AS ENUM ('WhatsApp', 'Messenger', 'Email', 'Phone', 'Interne');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. STRUCTURE DES SITES (SHOWROOMS)
CREATE TABLE IF NOT EXISTS showrooms (
    id TEXT PRIMARY KEY, -- 'Glass', 'Oloumi', 'Bord de mer'
    address TEXT NOT NULL,
    phone TEXT,
    manager_name TEXT,
    is_active BOOLEAN DEFAULT true,
    opening_hours JSONB DEFAULT '{"mon_sat": "08:30-18:30", "sun": "Closed"}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. UTILISATEURS & CONFIGURATION INTERFACE (Ref: Profile.tsx)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role user_role DEFAULT 'AGENT',
    showroom_id TEXT REFERENCES showrooms(id),
    avatar_url TEXT,
    status TEXT DEFAULT 'Actif',
    bio TEXT,
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Préférences de l'application (Widgets, Langue, Mode Sombre)
    preferences JSONB DEFAULT '{
        "language": "FR",
        "darkModeAuto": false,
        "pushNotifications": true,
        "criticalAlerts": true,
        "dashboardWidgets": [
            {"id": "kpis", "visible": true},
            {"id": "insights", "visible": true},
            {"id": "distribution", "visible": true},
            {"id": "zones", "visible": true}
        ]
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. CRM CLIENTS (PARTICULIERS & B2B)
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company_name TEXT, -- Pour les clients Entreprise (CFAO, etc.)
    phone TEXT NOT NULL,
    email TEXT,
    type TEXT CHECK (type IN ('Particulier', 'Entreprise')) DEFAULT 'Particulier',
    address TEXT,
    status TEXT CHECK (status IN ('Actif', 'VIP', 'Litige')) DEFAULT 'Actif',
    
    -- Statistiques financières cumulées
    total_spent NUMERIC DEFAULT 0,
    tickets_count INTEGER DEFAULT 0,
    last_visit_at TIMESTAMP WITH TIME ZONE,
    internal_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. CATALOGUE PRODUITS & GARANTIES CONSTRUCTEURS
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    reference TEXT UNIQUE NOT NULL, -- Référence sur facture
    name TEXT NOT NULL,
    brand TEXT NOT NULL, -- LG, Beko, Samsung...
    category TEXT,
    unit_price_ttc NUMERIC DEFAULT 0,
    warranty_months INTEGER DEFAULT 12,
    image_url TEXT,
    maintenance_guide_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. INVENTAIRE PIÈCES DÉTACHÉES (GESTION DES COÛTS)
CREATE TABLE IF NOT EXISTS parts (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT DEFAULT 'Mécanique',
    
    -- Logique de stock
    current_stock INTEGER DEFAULT 0,
    min_stock_alert INTEGER DEFAULT 5,
    location_bin TEXT, -- Emplacement rayon
    
    -- Données financières
    buy_price_ht NUMERIC DEFAULT 0, -- Coût d'achat pour Plaza
    sell_price_ttc NUMERIC DEFAULT 0, -- Prix facturé au client
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. ÉQUIPE TECHNIQUE & PERFORMANCE (Ref: Technicians.tsx)
CREATE TABLE IF NOT EXISTS technicians (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    specialties ticket_category[],
    avatar_url TEXT,
    phone TEXT,
    email TEXT,
    status TEXT DEFAULT 'Disponible',
    showroom_id TEXT REFERENCES showrooms(id),
    
    -- Indicateurs Qualité
    rating_avg NUMERIC(3,2) DEFAULT 5.0,
    nps_score INTEGER DEFAULT 100,
    first_fix_rate INTEGER DEFAULT 100,
    completed_tickets_count INTEGER DEFAULT 0,
    
    -- Historique de productivité (Stockage JSON pour les graphiques Recharts)
    productivity_history JSONB DEFAULT '[]'::jsonb
);

-- 8. TICKETS : LE CŒUR DES WORKFLOWS (Ref: Tickets.tsx & Documentation.tsx)
CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY, -- ex: T-1001
    customer_id TEXT REFERENCES customers(id),
    customer_name TEXT NOT NULL, -- Cache pour recherche rapide
    customer_phone TEXT,
    
    source source_type DEFAULT 'WhatsApp',
    showroom_id TEXT REFERENCES showrooms(id),
    category ticket_category DEFAULT 'SAV',
    status ticket_status DEFAULT 'Nouveau',
    priority ticket_priority DEFAULT 'Moyenne',
    
    -- Détails Équipement
    product_reference TEXT REFERENCES products(reference),
    serial_number TEXT,
    description TEXT NOT NULL,
    geo_zone TEXT, -- Akanda, Owendo, Glass...
    
    -- Assignation
    assigned_technician_id TEXT REFERENCES technicians(id),
    
    -- LOGIQUE DE WORKFLOW (Checklists JSON)
    installation_steps JSONB DEFAULT '[]'::jsonb, -- Checklist conformité
    maintenance_steps JSONB DEFAULT '[]'::jsonb,  -- Checklist préventive
    proof_image_url TEXT, -- Photo validation installation
    
    -- LOGIQUE FINANCIÈRE (Objet FinancialDetail dans types.ts)
    financials JSONB DEFAULT '{
        "partsTotal": 0, "partsCost": 0,
        "laborTotal": 0, "laborCost": 0,
        "travelFee": 5000, "logisticsCost": 2000,
        "discount": 0, "grandTotal": 0,
        "netMargin": 0, "isPaid": false,
        "paymentMethod": null, "invoiceNumber": null
    }'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 9. RÉGLAGES SYSTÈME & CONNECTEURS (Ref: Settings.tsx)
CREATE TABLE IF NOT EXISTS system_integrations (
    id TEXT PRIMARY KEY, -- 'whatsapp', 'facebook', 'email'
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    config_settings JSONB DEFAULT '{}'::jsonb,
    last_sync_at TIMESTAMP WITH TIME ZONE
);

-- 10. NOTIFICATIONS & ALERTES SLA
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT REFERENCES users(id),
    title TEXT NOT NULL,
    message TEXT,
    type TEXT CHECK (type IN ('info', 'success', 'warning', 'error')) DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 11. AUDIT TRAIL (HISTORIQUE DES ACTIONS)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id TEXT REFERENCES tickets(id),
    user_id TEXT REFERENCES users(id),
    action TEXT NOT NULL, -- 'Diagnostic IA', 'Changement Statut', 'Clôture Financière'
    previous_state JSONB,
    new_state JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- INDEXATION & OPTIMISATION
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON tickets(customer_name);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_parts_sku ON parts(sku);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_products_ref ON products(reference);

-- ==========================================
-- DONNÉES DE DÉMARRAGE (REGLAGES PLAZA)
-- ==========================================
INSERT INTO showrooms (id, address, phone, manager_name) VALUES 
('Glass', 'Boulevard Quaben, Libreville', '+241 11 72 00 01', 'Directeur Glass'),
('Oloumi', 'Zone Industrielle, Libreville', '+241 11 72 00 02', 'Manager Oloumi'),
('Bord de mer', 'Face Lycée National, Libreville', '+241 11 72 00 03', 'Manager BDM')
ON CONFLICT (id) DO NOTHING;

INSERT INTO system_integrations (id, name, is_active) VALUES 
('whatsapp', 'WhatsApp Business API', true),
('facebook', 'Facebook Messenger', false),
('email', 'Serveur Mail SAV', true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- SECURITÉ (RLS)
-- ==========================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON users FOR ALL USING (true);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON tickets FOR ALL USING (true);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON customers FOR ALL USING (true);

ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON parts FOR ALL USING (true);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON notifications FOR ALL USING (true);
