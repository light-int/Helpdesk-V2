
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHÉMA DE BASE DE DONNÉES GLOBAL v2
-- ==========================================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TYPES ÉNUMÉRÉS (LOGIQUE MÉTIER GABON)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'TECHNICIAN', 'AGENT', 'MANAGER');
    CREATE TYPE ticket_status AS ENUM ('Nouveau', 'En cours', 'En attente d''approbation', 'Résolu', 'Fermé');
    CREATE TYPE ticket_priority AS ENUM ('Basse', 'Moyenne', 'Haute', 'Urgent');
    CREATE TYPE ticket_category AS ENUM ('Livraison', 'Installation', 'SAV', 'Remboursement', 'Information', 'Maintenance', 'Climatisation', 'Électronique');
    CREATE TYPE source_type AS ENUM ('WhatsApp', 'Messenger', 'Email', 'Phone', 'Interne');
    CREATE TYPE impact_level AS ENUM ('Faible', 'Modéré', 'Critique');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABLE DES SHOWROOMS (CONFIGURATION SITES)
CREATE TABLE IF NOT EXISTS showrooms (
    id TEXT PRIMARY KEY, -- 'Glass', 'Oloumi', 'Bord de mer', 'Social Media'
    address TEXT,
    phone TEXT,
    is_open BOOLEAN DEFAULT true,
    hours TEXT DEFAULT '08:30 - 18:30',
    manager_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. TABLE DES UTILISATEURS & PRÉFÉRENCES (SYNC AVEC PROFILE.TSX)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    role user_role DEFAULT 'AGENT',
    showroom_id TEXT REFERENCES showrooms(id),
    avatar TEXT,
    status TEXT DEFAULT 'Actif',
    bio TEXT,
    preferences JSONB DEFAULT '{
        "pushNotifications": true,
        "darkModeAuto": false,
        "weeklyEmail": true,
        "criticalAlerts": true,
        "dashboardWidgets": [
            {"id": "kpis", "label": "Indicateurs Clés", "visible": true},
            {"id": "insights", "label": "Analytique IA", "visible": true},
            {"id": "distribution", "label": "Volume SAV", "visible": true},
            {"id": "zones", "label": "Zones Géo", "visible": true},
            {"id": "satisfaction", "label": "NPS & Trends", "visible": true},
            {"id": "brands", "label": "Parts de Marques", "visible": true}
        ]
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. TABLE DES CLIENTS (CRM ENRICHI)
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    type TEXT DEFAULT 'Particulier', -- 'Particulier' ou 'Entreprise'
    address TEXT,
    status TEXT DEFAULT 'Actif', -- 'Actif', 'VIP', 'Litige'
    company_name TEXT,
    total_spent NUMERIC DEFAULT 0,
    tickets_count INTEGER DEFAULT 0,
    last_visit TIMESTAMP WITH TIME ZONE DEFAULT now(),
    internal_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. TABLE DU CATALOGUE PRODUITS
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    reference TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    category TEXT,
    price NUMERIC DEFAULT 0,
    warranty_months INTEGER DEFAULT 12,
    image TEXT,
    maintenance_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. TABLE DES PIÈCES DÉTACHÉES (INVENTAIRE)
CREATE TABLE IF NOT EXISTS parts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category TEXT,
    brand TEXT,
    current_stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    unit_price NUMERIC DEFAULT 0,
    location TEXT, -- ex: 'Rayon A1 - Glass'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. TABLE DES TECHNICIENS (PERFORMANCE & PLANNING)
CREATE TABLE IF NOT EXISTS technicians (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    specialty ticket_category[],
    avatar TEXT,
    phone TEXT,
    email TEXT,
    status TEXT DEFAULT 'Disponible',
    rating NUMERIC(3,2) DEFAULT 5.0,
    nps INTEGER DEFAULT 100,
    first_fix_rate INTEGER DEFAULT 100,
    completed_tickets INTEGER DEFAULT 0,
    active_tickets INTEGER DEFAULT 0,
    avg_resolution_time TEXT DEFAULT '0h',
    performance_history JSONB DEFAULT '[]'::jsonb,
    showroom_id TEXT REFERENCES showrooms(id)
);

-- 8. TABLE DES TICKETS (COEUR DU SYSTÈME)
CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    source source_type DEFAULT 'WhatsApp',
    showroom_id TEXT REFERENCES showrooms(id),
    category ticket_category DEFAULT 'SAV',
    status ticket_status DEFAULT 'Nouveau',
    priority ticket_priority DEFAULT 'Moyenne',
    impact impact_level DEFAULT 'Modéré',
    
    product_reference TEXT REFERENCES products(reference),
    product_name TEXT,
    brand TEXT,
    serial_number TEXT,
    
    description TEXT,
    location_details TEXT,
    assigned_technician_id TEXT REFERENCES technicians(id),
    
    -- WORKFLOWS (Checklists)
    installation_checklist JSONB DEFAULT '[]'::jsonb,
    maintenance_checklist JSONB DEFAULT '[]'::jsonb,
    maintenance_frequency TEXT, -- 'Mensuelle', 'Trimestrielle', 'Annuelle'
    
    -- DONNÉES FINANCIÈRES (Calculées)
    financials JSONB DEFAULT '{
        "partsTotal": 0, "partsCost": 0,
        "laborTotal": 0, "laborCost": 0,
        "travelFee": 5000, "logisticsCost": 2000,
        "discount": 0, "grandTotal": 0,
        "netMargin": 0, "isPaid": false,
        "paymentMethod": null
    }'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_update TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. TABLE DES CONNECTEURS API (REGLAGES INTEGRATIONS)
CREATE TABLE IF NOT EXISTS integrations (
    id TEXT PRIMARY KEY, -- 'whatsapp', 'facebook', 'email'
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    last_sync TIMESTAMP WITH TIME ZONE,
    config JSONB DEFAULT '{}'::jsonb
);

-- 10. TABLE DES NOTIFICATIONS (PERSISTANCE APP)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT REFERENCES users(id),
    title TEXT NOT NULL,
    message TEXT,
    type TEXT DEFAULT 'info', -- 'success', 'warning', 'error'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- INDEXATION POUR RECHERCHE RAPIDE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON tickets(customer_name);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_parts_sku ON parts(sku);

-- ==========================================
-- DONNÉES INITIALES (REGLAGES DE BASE)
-- ==========================================
INSERT INTO showrooms (id, address, phone, hours) VALUES 
('Glass', 'Boulevard Quaben, Libreville', '+241 11 72 00 01', '08:30 - 18:30'),
('Oloumi', 'Zone Industrielle, Libreville', '+241 11 72 00 02', '08:00 - 17:30'),
('Bord de mer', 'Face Lycée National, Libreville', '+241 11 72 00 03', '09:00 - 19:00'),
('Social Media', 'Online Support Central', '+241 66 00 00 00', '24/7')
ON CONFLICT (id) DO NOTHING;

INSERT INTO integrations (id, name, is_active) VALUES 
('whatsapp', 'WhatsApp Business', true),
('facebook', 'Messenger Plaza', false),
('email', 'Serveur Mail SAV', true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- POLITIQUES DE SÉCURITÉ (RLS ACTIF)
-- ==========================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON users FOR ALL USING (true);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON tickets FOR ALL USING (true);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON customers FOR ALL USING (true);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON products FOR ALL USING (true);

ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON parts FOR ALL USING (true);

ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON technicians FOR ALL USING (true);

ALTER TABLE showrooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON showrooms FOR ALL USING (true);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON integrations FOR ALL USING (true);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON notifications FOR ALL USING (true);
