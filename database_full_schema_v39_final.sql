-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v39 (FINAL CONSOLIDATION)
-- Combines Logistics, Finances, KPIs, and Warranty Updates
-- ==========================================================

-- 1. Updates on Tickets Table (KPIs + Invoice + Flow)
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS "isEquipmentDown" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "downTimeHours" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "diagnosedAt" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT,
ADD COLUMN IF NOT EXISTS "repairFlow" TEXT DEFAULT 'Atelier';

-- 2. Updates on Products Table (KPIs)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS "downtimeCostPerHour" NUMERIC DEFAULT 25000;

-- 3. Updates on Warranties Table (Invoice traceability)
ALTER TABLE public.warranties 
ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT;
CREATE INDEX IF NOT EXISTS idx_warranties_invoice ON warranties("invoiceNumber");
COMMENT ON COLUMN warranties."invoiceNumber" IS 'Numéro de facture d''achat pour traçabilité de la garantie';

-- 4. Updates on Parts Table (Prices & Condition)
ALTER TABLE public.parts 
ADD COLUMN IF NOT EXISTS "purchasePrice" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "condition" TEXT DEFAULT 'Neuf';

-- 5. New Table: Vehicles
CREATE TABLE IF NOT EXISTS public.vehicles (
  "id" TEXT PRIMARY KEY,
  "plateNumber" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "status" TEXT DEFAULT 'Disponible',
  "driver" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. New Table: Transport Missions
CREATE TABLE IF NOT EXISTS public.transport_missions (
  "id" TEXT PRIMARY KEY,
  "ticketId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "driver" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "status" TEXT DEFAULT 'Planifié',
  "departureTime" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "arrivalTime" TIMESTAMP WITH TIME ZONE,
  "notes" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. New Table: Workshop Expenses
CREATE TABLE IF NOT EXISTS public.workshop_expenses (
  "id" TEXT PRIMARY KEY,
  "type" TEXT NOT NULL,
  "amount" NUMERIC NOT NULL,
  "date" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "description" TEXT NOT NULL,
  "recordedBy" TEXT NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. New Table: Fund Transfers
CREATE TABLE IF NOT EXISTS public.fund_transfers (
  "id" TEXT PRIMARY KEY,
  "amount" NUMERIC NOT NULL,
  "date" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "status" TEXT DEFAULT 'En attente',
  "fromAgent" TEXT NOT NULL,
  "toManager" TEXT NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Refresh the PostgREST cache
NOTIFY pgrst, 'reload schema';
