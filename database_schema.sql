
-- ==========================================
-- INITIALISATION DU SCHÉMA ROYAL PLAZA
-- ==========================================

-- 1. TYPES ÉNUMÉRÉS (ENUMS)
CREATE TYPE user_role AS ENUM ('ADMIN', 'TECHNICIAN', 'AGENT', 'MANAGER');
CREATE TYPE showroom_type AS ENUM ('Glass', 'Oloumi', 'Bord de mer', 'Social Media');
CREATE TYPE customer_type AS ENUM ('Particulier', 'Entreprise');
CREATE TYPE ticket_status AS ENUM ('Nouveau', 'En cours', 'En attente d''approbation', 'Résolu', 'Fermé');
CREATE TYPE ticket_priority AS ENUM ('Basse', 'Moyenne', 'Haute', 'Urgent');

-- 2. TABLE DES UTILISATEURS (Comptes accès)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, -- ex: U-101
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    role user_role DEFAULT 'AGENT',
    showroom showroom_type DEFAULT 'Glass',
    avatar TEXT,
    status TEXT DEFAULT 'Actif',
    preferences JSONB DEFAULT '{
        "pushNotifications": true,
        "darkModeAuto": false,
        "weeklyEmail": true,
        "criticalAlerts": true
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. TABLE DES CLIENTS
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY, -- ex: C-101
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    type customer_type DEFAULT 'Particulier',
    address TEXT,
    status TEXT DEFAULT 'Actif',
    "totalSpent" NUMERIC DEFAULT 0,
    "ticketsCount" INTEGER DEFAULT 0,
    "lastVisit" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "companyName" TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. TABLE DU CATALOGUE PRODUITS
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    reference TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    category TEXT,
    price NUMERIC DEFAULT 0,
    "warrantyMonths" INTEGER DEFAULT 12,
    image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. TABLE DES PIÈCES DÉTACHÉES (INVENTAIRE)
CREATE TABLE IF NOT EXISTS parts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category TEXT,
    brand TEXT,
    "currentStock" INTEGER DEFAULT 0,
    "minStock" INTEGER DEFAULT 5,
    "unitPrice" NUMERIC DEFAULT 0,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. TABLE DES TECHNICIENS (ÉQUIPE)
CREATE TABLE IF NOT EXISTS technicians (
    id TEXT PRIMARY KEY, -- ex: TECH-01
    name TEXT NOT NULL,
    specialty TEXT[], -- Array de catégories (SAV, Climatisation...)
    avatar TEXT,
    phone TEXT,
    email TEXT,
    "activeTickets" INTEGER DEFAULT 0,
    "completedTickets" INTEGER DEFAULT 0,
    "avgResolutionTime" TEXT,
    rating NUMERIC(3,2) DEFAULT 5.0,
    status TEXT DEFAULT 'Disponible',
    nps INTEGER DEFAULT 0,
    "firstFixRate" INTEGER DEFAULT 0,
    "performanceHistory" JSONB DEFAULT '[]'::jsonb
);

-- 7. TABLE DES TICKETS (COEUR DU SYSTÈME)
CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY, -- ex: T-1001
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    source TEXT,
    showroom showroom_type DEFAULT 'Glass',
    category TEXT,
    status ticket_status DEFAULT 'Nouveau',
    priority ticket_priority DEFAULT 'Moyenne',
    "productReference" TEXT,
    "productName" TEXT,
    "serialNumber" TEXT,
    description TEXT,
    location TEXT,
    "assignedTechnicianId" TEXT REFERENCES technicians(id),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "lastUpdate" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- DONNÉES FINANCIÈRES (Objet FinancialDetail)
    -- Contient: partsTotal, laborTotal, travelFee, discount, partsCost, laborCost, logisticsCost, grandTotal, netMargin, isPaid...
    financials JSONB DEFAULT '{
        "partsTotal": 0,
        "laborTotal": 0,
        "travelFee": 5000,
        "discount": 0,
        "partsCost": 0,
        "laborCost": 0,
        "logisticsCost": 0,
        "grandTotal": 0,
        "netMargin": 0,
        "isPaid": false
    }'::jsonb
);

-- 8. TABLE DES GARANTIES
CREATE TABLE IF NOT EXISTS warranties (
    id TEXT PRIMARY KEY,
    product TEXT,
    brand TEXT,
    "serialNumber" TEXT UNIQUE,
    "customerName" TEXT,
    "purchaseDate" DATE,
    "durationMonths" INTEGER,
    "expiryDate" DATE,
    "isExtensionAvailable" BOOLEAN DEFAULT false
);

-- 9. TABLE DES INTERVENTIONS (LOG HISTORIQUE)
CREATE TABLE IF NOT EXISTS interventions (
    id TEXT PRIMARY KEY,
    "technicianId" TEXT REFERENCES technicians(id),
    "technicianName" TEXT,
    zone TEXT,
    competence TEXT,
    date DATE DEFAULT CURRENT_DATE,
    "startTime" TIME,
    "endTime" TIME,
    "partsUsed" TEXT[],
    cost NUMERIC,
    "customerRating" INTEGER
);

-- ==========================================
-- INDEXATION POUR LES PERFORMANCES
-- ==========================================
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_customer ON tickets("customerName");
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_parts_sku ON parts(sku);
CREATE INDEX idx_products_ref ON products(reference);

-- ==========================================
-- POLITIQUES DE SÉCURITÉ (RLS) - OPTIONNEL
-- Par défaut, Supabase désactive l'accès public. 
-- Pour autoriser l'app (si pas d'auth Supabase configurée), activez ceci :
-- ==========================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow Public Access" ON users FOR ALL USING (true);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow Public Access" ON tickets FOR ALL USING (true);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow Public Access" ON customers FOR ALL USING (true);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow Public Access" ON products FOR ALL USING (true);

ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow Public Access" ON parts FOR ALL USING (true);

ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow Public Access" ON technicians FOR ALL USING (true);
