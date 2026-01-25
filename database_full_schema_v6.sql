
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v6 (REFÉRENTIELS)
-- ==========================================================

-- 1. TABLE DES MARQUES (Centralisation pour SAV et Stocks)
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. ENRICHISSEMENT DES SHOWROOMS
-- On s'assure que la table existe avec les bons champs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'showrooms') THEN
        CREATE TABLE showrooms (
            id TEXT PRIMARY KEY,
            address TEXT,
            phone TEXT,
            hours TEXT,
            is_active BOOLEAN DEFAULT true
        );
    END IF;
END $$;

-- 3. INSERTION DES DONNÉES INITIALES SI VIDE
INSERT INTO brands (name) 
VALUES ('LG'), ('Beko'), ('Samsung'), ('Hisense'), ('Royal Plaza'), ('BuroPlus'), ('TCL'), ('Midea')
ON CONFLICT (name) DO NOTHING;

INSERT INTO showrooms (id, address, phone, hours) VALUES 
('Glass', 'Boulevard Quaben, Libreville', '+241 11 72 00 01', '08:30-18:30'),
('Oloumi', 'Z.I. Oloumi, Libreville', '+241 11 72 00 02', '08:00-17:30'),
('Bord de mer', 'Face Lycée National, Libreville', '+241 11 72 00 03', '09:00-19:00')
ON CONFLICT (id) DO NOTHING;

-- 4. SECURITÉ
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON brands FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE showrooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON showrooms FOR ALL USING (true) WITH CHECK (true);
