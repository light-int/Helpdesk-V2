-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v41 (ALL MODULES ENHANCED)
-- ==========================================================

-- ==========================================================
-- MODULE TICKETS ENHANCEMENTS
-- ==========================================================

-- Table tags/labels pour tickets
CREATE TABLE IF NOT EXISTS ticket_tags (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "ticketId" TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3ecf8e',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_tags_ticket ON ticket_tags("ticketId");

-- Table SLA metrics
CREATE TABLE IF NOT EXISTS sla_metrics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "ticketId" TEXT NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "firstResponseAt" TIMESTAMPTZ,
  "resolvedAt" TIMESTAMPTZ,
  "breachedAt" TIMESTAMPTZ,
  "slaTargetHours" INTEGER DEFAULT 24,
  status TEXT DEFAULT 'OnTrack' CHECK (status IN ('OnTrack', 'AtRisk', 'Breached'))
);

CREATE INDEX IF NOT EXISTS idx_sla_metrics_ticket ON sla_metrics("ticketId");
CREATE INDEX IF NOT EXISTS idx_sla_metrics_status ON sla_metrics(status);

-- Table merges de tickets
CREATE TABLE IF NOT EXISTS ticket_merges (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "sourceTicketId" TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  "targetTicketId" TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  "mergedAt" TIMESTAMPTZ DEFAULT NOW(),
  "mergedBy" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ticket_merges_source ON ticket_merges("sourceTicketId");
CREATE INDEX IF NOT EXISTS idx_ticket_merges_target ON ticket_merges("targetTicketId");

-- ==========================================================
-- MODULE CLIENTS ENHANCEMENTS
-- ==========================================================

-- Table timeline clients
CREATE TABLE IF NOT EXISTS customer_timeline (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "customerId" TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('TICKET', 'CALL', 'VISIT', 'PURCHASE', 'SUPPORT')),
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_customer_timeline_customer ON customer_timeline("customerId");
CREATE INDEX IF NOT EXISTS idx_customer_timeline_date ON customer_timeline(date DESC);

-- Table segments clients
CREATE TABLE IF NOT EXISTS customer_segments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "customerId" TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  segment TEXT NOT NULL CHECK (segment IN ('VIP', 'Professionnel', 'Particulier', 'Nouveau', 'Fidèle')),
  "assignedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_segments_customer ON customer_segments("customerId");

-- Table portails clients
CREATE TABLE IF NOT EXISTS customer_portals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "customerId" TEXT NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  "accessToken" TEXT NOT NULL UNIQUE,
  "qrCode" TEXT,
  "expiresAt" TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 year'),
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_portals_token ON customer_portals("accessToken");

-- Table logs de communication
CREATE TABLE IF NOT EXISTS communication_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "customerId" TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('EMAIL', 'SMS', 'CALL', 'WHATSAPP', 'VISIT')),
  direction TEXT NOT NULL CHECK (direction IN ('IN', 'OUT')),
  content TEXT NOT NULL,
  "sentAt" TIMESTAMPTZ DEFAULT NOW(),
  "sentBy" TEXT
);

CREATE INDEX IF NOT EXISTS idx_comm_logs_customer ON communication_logs("customerId");
CREATE INDEX IF NOT EXISTS idx_comm_logs_date ON communication_logs("sentAt" DESC);

-- ==========================================================
-- MODULE TECHNICIENS ENHANCEMENTS
-- ==========================================================

-- Table planning techniciens
CREATE TABLE IF NOT EXISTS technician_schedules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "technicianId" TEXT NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  "ticketId" TEXT REFERENCES tickets(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  "startTime" TIMESTAMPTZ NOT NULL,
  "endTime" TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('INTERVENTION', 'MAINTENANCE', 'FORMATION', 'CONGÉ')),
  status TEXT DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_tech_schedules_tech ON technician_schedules("technicianId");
CREATE INDEX IF NOT EXISTS idx_tech_schedules_date ON technician_schedules("startTime");

-- Table metrics mensuels techniciens
CREATE TABLE IF NOT EXISTS technician_metrics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "technicianId" TEXT NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  period TEXT NOT NULL, -- Format: YYYY-MM
  "ticketsResolved" INTEGER DEFAULT 0,
  "avgResolutionTime" INTEGER DEFAULT 0, -- en minutes
  "firstFixRate" NUMERIC DEFAULT 0, -- pourcentage
  "customerSatisfaction" NUMERIC DEFAULT 0, -- NPS 0-10
  "revenueGenerated" NUMERIC DEFAULT 0,
  UNIQUE("technicianId", period)
);

CREATE INDEX IF NOT EXISTS idx_tech_metrics_tech ON technician_metrics("technicianId");
CREATE INDEX IF NOT EXISTS idx_tech_metrics_period ON technician_metrics(period);

-- ==========================================================
-- MODULE DASHBOARD ENHANCEMENTS
-- ==========================================================

-- Table widgets dashboard
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('TICKETS_STATUS', 'REVENUE', 'STOCK_ALERTS', 'TECH_PERFORMANCE', 'SLA_STATUS', 'CUSTOMER_STATS')),
  position INTEGER NOT NULL DEFAULT 0,
  config JSONB DEFAULT '{}',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_user ON dashboard_widgets("userId");

-- Table rapports automatiques
CREATE TABLE IF NOT EXISTS automated_reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY')),
  recipients TEXT[] DEFAULT '{}',
  "lastSentAt" TIMESTAMPTZ,
  "isActive" BOOLEAN DEFAULT true,
  filters JSONB DEFAULT '{}',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_reports_active ON automated_reports("isActive") WHERE "isActive" = true;

-- ==========================================================
-- MISE À JOUR TABLE TICKETS (nouvelles colonnes JSONB)
-- ==========================================================

-- Ajouter colonnes pour stocker les tags et SLA en JSONB (optionnel, redondant avec tables dédiées)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS "tags" JSONB DEFAULT '[]';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS "slaMetrics" JSONB DEFAULT NULL;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS "parentTicketId" TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS "estimatedResolutionTime" INTEGER;

COMMENT ON COLUMN tickets."tags" IS 'Tags du ticket (JSONB array)';
COMMENT ON COLUMN tickets."slaMetrics" IS 'Métriques SLA (JSONB)';
COMMENT ON COLUMN tickets."parentTicketId" IS 'ID ticket parent si fusionné';
COMMENT ON COLUMN tickets."estimatedResolutionTime" IS 'Temps estimé de résolution (minutes)';

-- ==========================================================
-- VUES ANALYTIQUES
-- ==========================================================

-- Vue synthèse tickets par statut pour dashboard
CREATE OR REPLACE VIEW view_tickets_summary AS
SELECT 
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '7 days') as new_this_week,
  AVG(EXTRACT(EPOCH FROM (COALESCE("lastUpdate", NOW()) - "createdAt"))/3600) as avg_hours_open
FROM tickets
WHERE "isArchived" = false OR "isArchived" IS NULL
GROUP BY status;

-- Vue performance techniciens du mois
CREATE OR REPLACE VIEW view_tech_performance_current_month AS
SELECT 
  t.id as technician_id,
  t.name,
  t.specialty,
  tm."ticketsResolved",
  tm."avgResolutionTime",
  tm."firstFixRate",
  tm."customerSatisfaction",
  tm."revenueGenerated"
FROM technicians t
LEFT JOIN technician_metrics tm ON t.id = tm."technicianId" 
  AND tm.period = TO_CHAR(NOW(), 'YYYY-MM')
WHERE t.status != 'Hors ligne';
