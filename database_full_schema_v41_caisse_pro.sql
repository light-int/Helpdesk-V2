-- ROYAL PLAZA HELPDESK - SCHEMA v41 (CAISSE PRO)
-- Ajout de la gestion des sessions de caisse et traçabilité des transactions

-- 1. Séquence pour la numérotation des factures
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1000;

-- 2. Table des Sessions de Caisse
CREATE TABLE IF NOT EXISTS cash_register_sessions (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'Ouverte' CHECK (status IN ('Ouverte', 'Fermée')),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE,
    opening_balance NUMERIC NOT NULL DEFAULT 0,
    closing_balance NUMERIC DEFAULT 0,
    total_theoretical NUMERIC DEFAULT 0,
    total_real NUMERIC DEFAULT 0,
    notes TEXT,
    opened_by TEXT REFERENCES users(id),
    closed_by TEXT REFERENCES users(id)
);

-- 3. Table du Journal de Caisse (Transactions)
CREATE TABLE IF NOT EXISTS cash_register_entries (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES cash_register_sessions(id) ON DELETE CASCADE,
    ticket_id TEXT REFERENCES tickets(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('Acompte', 'Solde', 'Dépense', 'Ajustement')),
    amount NUMERIC NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('Espèces', 'Airtel Money', 'Moov Money', 'Virement', 'Carte')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recorded_by TEXT REFERENCES users(id),
    notes TEXT
);

-- Index pour la performance
CREATE INDEX IF NOT EXISTS idx_entries_session ON cash_register_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_entries_ticket ON cash_register_entries(ticket_id);

-- Fonction pour générer le numéro de facture au format FAC-YYYY-XXXX
CREATE OR REPLACE FUNCTION generate_invoice_number() 
RETURNS TEXT AS $$
DECLARE
    seq_val INT;
    year_val TEXT;
BEGIN
    SELECT nextval('invoice_seq') INTO seq_val;
    SELECT to_char(CURRENT_DATE, 'YYYY') INTO year_val;
    RETURN 'FAC-' || year_val || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;
