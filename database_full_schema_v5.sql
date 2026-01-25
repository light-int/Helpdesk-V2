
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA DEFINITIF v5 (CORRIGÉ)
-- Alignement strict TypeScript <-> Database
-- ==========================================================

-- 0. NETTOYAGE TOTAL (AVEC CASCADE POUR LES DÉPENDANCES)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS interventions CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS warranties CASCADE;
DROP TABLE IF EXISTS parts CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS showrooms CASCADE;
DROP TABLE IF EXISTS technicians CASCADE;

-- 1. SHOWROOMS
CREATE TABLE showrooms (
    id TEXT PRIMARY KEY,
    address TEXT,
    phone TEXT,
    hours TEXT
);

-- 2. CLIENTS
CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    type TEXT DEFAULT 'Particulier',
    address TEXT,
    status TEXT DEFAULT 'Actif',
    "totalSpent" NUMERIC DEFAULT 0,
    "ticketsCount" INTEGER DEFAULT 0,
    "lastVisit" TEXT,
    "companyName" TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. PRODUITS
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    reference TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    category TEXT,
    price NUMERIC DEFAULT 0,
    "warrantyMonths" INTEGER DEFAULT 12,
    image TEXT
);

-- 4. PIÈCES
CREATE TABLE parts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category TEXT,
    brand TEXT,
    "currentStock" INTEGER DEFAULT 0,
    "minStock" INTEGER DEFAULT 5,
    "unitPrice" NUMERIC DEFAULT 0,
    location TEXT
);

-- 5. TECHNICIENS
CREATE TABLE technicians (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    specialty TEXT[],
    avatar TEXT,
    phone TEXT,
    email TEXT,
    status TEXT DEFAULT 'Disponible',
    rating NUMERIC DEFAULT 5.0,
    nps INTEGER DEFAULT 100,
    "firstFixRate" INTEGER DEFAULT 100,
    "completedTickets" INTEGER DEFAULT 0,
    "activeTickets" INTEGER DEFAULT 0,
    "avgResolutionTime" TEXT,
    "performanceHistory" JSONB DEFAULT '[]'::jsonb
);

-- 6. TICKETS (CŒUR DU SYSTÈME)
-- ON DELETE SET NULL sur assignedTechnicianId pour permettre la suppression du tech sans perdre le ticket
CREATE TABLE tickets (
    id TEXT PRIMARY KEY,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    source TEXT,
    showroom TEXT,
    category TEXT,
    status TEXT,
    priority TEXT,
    "productReference" TEXT,
    "productName" TEXT,
    "serialNumber" TEXT,
    description TEXT,
    "assignedTechnicianId" TEXT REFERENCES technicians(id) ON DELETE SET NULL,
    "createdAt" TEXT,
    "lastUpdate" TEXT,
    financials JSONB DEFAULT '{}'::jsonb,
    "customerId" TEXT REFERENCES customers(id) ON DELETE CASCADE
);

-- 7. INTERVENTIONS (HISTORIQUE)
-- ON DELETE SET NULL crucial pour la suppression des techniciens
CREATE TABLE interventions (
    id TEXT PRIMARY KEY,
    "technicianId" TEXT REFERENCES technicians(id) ON DELETE SET NULL,
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

-- 8. USERS
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    role TEXT,
    avatar TEXT,
    status TEXT,
    showroom TEXT,
    preferences JSONB DEFAULT '{}'::jsonb
);

-- 9. POLITIQUES DE SÉCURITÉ (RLS)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON customers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON tickets FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON products FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON parts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON technicians FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON interventions FOR ALL USING (true) WITH CHECK (true);

-- 10. DONNÉES INITIALES
INSERT INTO showrooms (id, address, phone, hours) VALUES 
('Glass', 'Bld Quaben', '+241 11 72 00 01', '08:30-18:30'),
('Oloumi', 'Z.I. Oloumi', '+241 11 72 00 02', '08:00-17:30');
