-- Script de création des tables Supabase pour Helpdesk V2 Plaza
-- À exécuter dans l'éditeur SQL de votre projet Supabase

-- 1. Table Users
CREATE TABLE IF NOT EXISTS public.users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password text,
  role text,
  showroom text,
  avatar text,
  status text,
  preferences jsonb,
  "lastLogin" timestamp with time zone,
  "mfaEnabled" boolean DEFAULT false
);

-- 2. Table Tickets
CREATE TABLE IF NOT EXISTS public.tickets (
  id text PRIMARY KEY,
  "customerName" text,
  "customerPhone" text,
  source text,
  showroom text,
  category text,
  status text,
  priority text,
  "productReference" text,
  "productName" text,
  "serialNumber" text,
  description text,
  "assignedTechnicianId" text,
  "createdAt" timestamp with time zone,
  "lastUpdate" timestamp with time zone,
  financials jsonb,
  "customerId" text,
  brand text,
  "purchaseDate" timestamp with time zone,
  location text,
  "interventionLocation" text,
  "clientImpact" text,
  "interventionReport" jsonb,
  quotation jsonb,
  "isArchived" boolean DEFAULT false
);

-- 3. Table Products
CREATE TABLE IF NOT EXISTS public.products (
  id text PRIMARY KEY,
  reference text,
  name text,
  brand text,
  category text,
  price numeric,
  image text,
  image_url text
);

-- 4. Table Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id text PRIMARY KEY,
  name text,
  phone text,
  email text,
  type text,
  address text,
  status text,
  "totalSpent" numeric DEFAULT 0,
  "ticketsCount" integer DEFAULT 0,
  "lastVisit" timestamp with time zone,
  "companyName" text,
  "isArchived" boolean DEFAULT false
);

-- 5. Table Parts (Pièces détachées)
CREATE TABLE IF NOT EXISTS public.parts (
  id text PRIMARY KEY,
  name text,
  category text,
  brand text,
  stock integer DEFAULT 0,
  "minStock" integer DEFAULT 5,
  price numeric DEFAULT 0,
  description text,
  location text,
  "lastRestock" timestamp with time zone,
  "supplier" text,
  "imageUrl" text
);

-- 6. Table Stock Movements
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id text PRIMARY KEY,
  "partId" text,
  type text,
  quantity integer,
  date timestamp with time zone,
  reason text,
  author text,
  "ticketId" text
);

-- 7. Table Technicians
CREATE TABLE IF NOT EXISTS public.technicians (
  id text PRIMARY KEY,
  name text NOT NULL,
  specialty text,
  avatar text,
  avatar_url text,
  phone text,
  email text,
  status text,
  rating numeric,
  nps numeric,
  first_fix_rate numeric,
  completed_tickets integer DEFAULT 0,
  active_tickets integer DEFAULT 0,
  avg_resolution_time numeric,
  performance_history jsonb,
  showroom text
);

-- 8. Table Warranties
CREATE TABLE IF NOT EXISTS public.warranties (
  id text PRIMARY KEY,
  "product" text,
  brand text,
  "serialNumber" text,
  "purchaseDate" timestamp with time zone,
  "expiryDate" timestamp with time zone,
  "customerName" text,
  status text
);

-- 9. Table Showrooms
CREATE TABLE IF NOT EXISTS public.showrooms (
  id text PRIMARY KEY,
  address text,
  phone text,
  hours text,
  is_active boolean DEFAULT true
);

-- 10. Table Brands
CREATE TABLE IF NOT EXISTS public.brands (
  name text PRIMARY KEY
);

-- 11. Table System Config
CREATE TABLE IF NOT EXISTS public.system_config (
  id text PRIMARY KEY,
  "aiEnabled" boolean DEFAULT true,
  "aiProvider" text DEFAULT 'google',
  "aiModel" text DEFAULT 'flash',
  "aiAutoCategorization" boolean DEFAULT true,
  "aiStrategicAudit" boolean DEFAULT true,
  "aiChatbotEnabled" boolean DEFAULT true,
  "autoTranslate" boolean DEFAULT false,
  "sessionTimeout" integer DEFAULT 60,
  "mfaRequired" boolean DEFAULT false,
  "syncFrequency" text DEFAULT 'realtime',
  "maintenanceMode" boolean DEFAULT false,
  "passwordComplexity" text DEFAULT 'medium'
);

-- 12. Table User Connections (Logs)
CREATE TABLE IF NOT EXISTS public.user_connections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text,
  timestamp timestamp with time zone,
  metadata jsonb
);

-- Insertion de la configuration par défaut
INSERT INTO public.system_config (id) VALUES ('GLOBAL') ON CONFLICT DO NOTHING;

-- Création de l'Administrateur Principal dans la table Database 
-- ATTENTION : Ce compte doit AUSSI être créé dans l'onglet "Authentication" de Supabase avec le même email.
INSERT INTO public.users (id, name, email, role, status, showroom) 
VALUES ('U-ADMIN-01', 'Admin Root', 'obamenzoghobilly@gmail.com', 'ADMIN', 'Actif', 'Glass')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- Désactivation temporaire de la RLS pour un fonctionnement fluide côté client avant la mise en place de politiques de sécurité strictes.
-- Si vous souhaitez activer RLS, définissez vos politiques de la façon suivante :
-- ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable read/write for authenticated users" ON public.tickets FOR ALL USING (auth.role() = 'authenticated');
