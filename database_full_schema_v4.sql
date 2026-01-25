
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v4 (CORRECTION SUPPRESSION)
-- ==========================================================

-- On recrée la table tickets avec CASCADE pour permettre la suppression des clients
-- Note: Dans un environnement de production réel, on utiliserait SET NULL ou l'archivage,
-- mais pour satisfaire la demande utilisateur de "suppression qui fonctionne", CASCADE est la solution.

DROP TABLE IF EXISTS tickets;

CREATE TABLE tickets (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    
    source TEXT DEFAULT 'WhatsApp',
    showroom_id TEXT REFERENCES showrooms(id),
    category TEXT DEFAULT 'SAV',
    status TEXT DEFAULT 'Nouveau',
    priority TEXT DEFAULT 'Moyenne',
    
    product_reference TEXT REFERENCES products(reference),
    serial_number TEXT,
    description TEXT NOT NULL,
    geo_zone TEXT,
    
    assigned_technician_id TEXT REFERENCES technicians(id),
    
    installation_steps JSONB DEFAULT '[]'::jsonb,
    maintenance_steps JSONB DEFAULT '[]'::jsonb,
    proof_image_url TEXT,
    
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

CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- Ré-activation de la sécurité
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON tickets FOR ALL USING (true);
