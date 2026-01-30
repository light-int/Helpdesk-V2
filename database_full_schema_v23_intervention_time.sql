
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v23 (SLA & CHRONOMÉTRAGE)
-- ==========================================================

-- Documentation de la structure interne du champ JSONB interventionReport
-- pour les besoins du calcul du temps d'intervention.

COMMENT ON COLUMN tickets."interventionReport" IS 'Contient le rapport technique enrichi :
{
  "startedAt": "ISO8601 string", -- Timestamp du début de l''intervention
  "performedAt": "ISO8601 string", -- Timestamp de fin/clôture technique
  "durationMs": number, -- Durée calculée en millisecondes
  "actionsTaken": string[],
  "partsUsed": object[],
  "recommendations": string,
  "equipmentStatus": string
}';

-- Exemple de vue SQL pour analyser la performance (pour un futur usage Dashboard Manager)
-- CREATE OR REPLACE VIEW view_tech_performance AS
-- SELECT 
--    "assignedTechnicianId",
--    COUNT(*) as total_interventions,
--    AVG(("interventionReport"->>'durationMs')::numeric) / 60000 as avg_duration_minutes
-- FROM tickets 
-- WHERE "interventionReport"->>'durationMs' IS NOT NULL
-- GROUP BY "assignedTechnicianId";
