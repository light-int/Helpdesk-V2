-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. BASE CONFIG & TABLES
CREATE TABLE IF NOT EXISTS public.brands (
    name TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.showrooms (
    id TEXT PRIMARY KEY,
    address TEXT,
    phone TEXT,
    hours TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.system_config (
    id TEXT PRIMARY KEY DEFAULT 'GLOBAL',
    aiEnabled BOOLEAN DEFAULT true,
    aiProvider TEXT DEFAULT 'google',
    aiModel TEXT DEFAULT 'pro',
    aiAutoCategorization BOOLEAN DEFAULT true,
    aiStrategicAudit BOOLEAN DEFAULT true,
    aiChatbotEnabled BOOLEAN DEFAULT true,
    autoTranslate BOOLEAN DEFAULT false,
    sessionTimeout INTEGER DEFAULT 30,
    mfaRequired BOOLEAN DEFAULT false,
    syncFrequency TEXT DEFAULT 'realtime',
    maintenanceMode BOOLEAN DEFAULT false,
    passwordComplexity TEXT DEFAULT 'medium'
);

-- 2. USER & TEAM MANAGEMENT
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    role TEXT NOT NULL DEFAULT 'TECHNICIAN' CHECK (role IN ('ADMIN', 'TECHNICIAN', 'AGENT', 'MANAGER')),
    showroom TEXT,
    avatar TEXT,
    status TEXT DEFAULT 'Actif',
    preferences JSONB DEFAULT '{}',
    lastLogin TIMESTAMP WITH TIME ZONE,
    mfaEnabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teams (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    name TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.technicians (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    specialty TEXT[],
    avatar TEXT,
    phone TEXT,
    email TEXT,
    status TEXT DEFAULT 'Disponible',
    rating NUMERIC DEFAULT 5.0,
    nps NUMERIC,
    first_fix_rate NUMERIC,
    completed_tickets INTEGER DEFAULT 0,
    active_tickets INTEGER DEFAULT 0,
    avg_resolution_time TEXT,
    performance_history JSONB,
    showroom TEXT,
    teamId TEXT REFERENCES teams(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PRODUCTS & WARRANTIES
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    reference TEXT NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    warrantyMonths INTEGER DEFAULT 12,
    image TEXT,
    downtimeCostPerHour NUMERIC DEFAULT 25000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.warranties (
    id TEXT PRIMARY KEY,
    productId TEXT,
    customerId TEXT,
    product TEXT NOT NULL,
    brand TEXT NOT NULL,
    serialNumber TEXT NOT NULL,
    customerName TEXT NOT NULL,
    purchaseDate TIMESTAMP WITH TIME ZONE NOT NULL,
    durationMonths INTEGER NOT NULL,
    expiryDate TIMESTAMP WITH TIME ZONE NOT NULL,
    "isExtensionAvailable" BOOLEAN DEFAULT false,
    invoiceNumber TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TICKETS & INTERVENTIONS
CREATE TABLE IF NOT EXISTS public.tickets (
    id TEXT PRIMARY KEY,
    customerId TEXT,
    customerName TEXT NOT NULL,
    customerPhone TEXT,
    source TEXT NOT NULL DEFAULT 'Interne',
    showroom TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Nouveau',
    priority TEXT NOT NULL DEFAULT 'Moyenne',
    productReference TEXT,
    productName TEXT,
    brand TEXT,
    serialNumber TEXT,
    purchaseDate TIMESTAMP WITH TIME ZONE,
    clientImpact TEXT,
    assignedTechnicianId TEXT REFERENCES technicians(id) ON DELETE SET NULL,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    lastUpdate TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT,
    location TEXT,
    "interventionLocation" TEXT DEFAULT 'à l\'atelier',
    financials JSONB,
    interventionReport JSONB,
    quotation JSONB,
    isArchived BOOLEAN DEFAULT false,
    invoiceNumber TEXT,
    isEquipmentDown BOOLEAN DEFAULT false,
    downTimeHours NUMERIC DEFAULT 0,
    diagnosedAt TIMESTAMP WITH TIME ZONE,
    repairFlow TEXT DEFAULT 'Atelier'
);

CREATE TABLE IF NOT EXISTS public.prestations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    fixed_cost NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. INVENTORY
CREATE TABLE IF NOT EXISTS public.parts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category TEXT,
    brand TEXT,
    currentStock INTEGER DEFAULT 0,
    minStock INTEGER DEFAULT 5,
    unitPrice NUMERIC NOT NULL,
    purchasePrice NUMERIC DEFAULT 0,
    condition TEXT DEFAULT 'Neuf',
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
    id TEXT PRIMARY KEY,
    partId TEXT REFERENCES parts(id) ON DELETE CASCADE,
    partName TEXT,
    quantity INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('IN', 'OUT')),
    reason TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    performedBy TEXT,
    ticketId TEXT
);

-- 6. FINANCE & CASH REGISTER

-- Table des caisses physiques (multi-caisse)
CREATE TABLE IF NOT EXISTS public.cash_registers (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    default_operator_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions de caisse avec identification de la caisse physique
CREATE TABLE IF NOT EXISTS public.cash_register_sessions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    cash_register_id TEXT REFERENCES public.cash_registers(id) ON DELETE SET NULL,
    cash_register_name TEXT,
    status TEXT NOT NULL DEFAULT 'Ouverte' CHECK (status IN ('Ouverte', 'Fermée')),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE,
    opening_balance NUMERIC NOT NULL DEFAULT 0,
    closing_balance NUMERIC DEFAULT 0,
    total_theoretical NUMERIC DEFAULT 0,
    total_real NUMERIC DEFAULT 0,
    notes TEXT,
    opened_by TEXT,
    opened_by_name TEXT,
    closed_by TEXT,
    closed_by_name TEXT,
    operator_id TEXT,
    operator_name TEXT
);

CREATE TABLE IF NOT EXISTS public.cash_register_entries (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    session_id TEXT REFERENCES public.cash_register_sessions(id) ON DELETE CASCADE,
    cash_register_id TEXT,
    ticket_id TEXT,
    type TEXT NOT NULL CHECK (type IN ('Acompte', 'Solde', 'Dépense', 'Ajustement')),
    amount NUMERIC NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('Espèces', 'Airtel Money', 'Moov Money', 'Virement', 'Carte')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recorded_by TEXT,
    recorded_by_name TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS public.workshop_expenses (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT NOT NULL,
    recorded_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fund_transfers (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    amount NUMERIC NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'En attente' CHECK (status IN ('En attente', 'Validé', 'Rejeté')),
    from_agent TEXT NOT NULL,
    to_manager TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. LOGISTICS
CREATE TABLE IF NOT EXISTS public.vehicles (
  id TEXT PRIMARY KEY,
  plateNumber TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT DEFAULT 'Disponible',
  driver TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transport_missions (
  id TEXT PRIMARY KEY,
  ticketId TEXT NOT NULL,
  vehicleId TEXT NOT NULL,
  driver TEXT NOT NULL,
  destination TEXT NOT NULL,
  status TEXT DEFAULT 'Planifié',
  departureTime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  arrivalTime TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. COMMUNICATIONS & MISC
CREATE TABLE IF NOT EXISTS public.conversations (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    customer_name TEXT NOT NULL,
    customer_avatar TEXT,
    source TEXT,
    last_message TEXT,
    unread_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open',
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type TEXT CHECK (sender_type IN ('client', 'agent', 'system')),
    sender_name TEXT,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'sent',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    userId TEXT,
    userName TEXT,
    action TEXT,
    target TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details TEXT
);

CREATE TABLE IF NOT EXISTS public.user_connections (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

CREATE TABLE IF NOT EXISTS public.strategic_reports (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    startDate TEXT,
    endDate TEXT,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    statsSnapshot JSONB
);

CREATE TABLE IF NOT EXISTS public.integration_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    enabled BOOLEAN DEFAULT false,
    api_key TEXT,
    webhook_url TEXT,
    settings JSONB DEFAULT '{}',
    last_sync TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    type TEXT DEFAULT 'Particulier',
    address TEXT,
    status TEXT DEFAULT 'Actif',
    totalSpent NUMERIC DEFAULT 0,
    ticketsCount INTEGER DEFAULT 0,
    lastVisit TIMESTAMP WITH TIME ZONE,
    companyName TEXT,
    isArchived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. LOGIC & SEQUENCES
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1000;

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

-- 10. ROW LEVEL SECURITY (Simplified for authenticated)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all access" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Allow all access" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
