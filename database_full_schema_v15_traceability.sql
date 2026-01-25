
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v15 (TRAÇABILITÉ TOTALE)
-- ==========================================================

-- Ajout de la colonne ticketId à la table stock_movements
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS "ticketId" TEXT REFERENCES tickets(id) ON DELETE SET NULL;

-- Indexation pour les recherches croisées (Quelle pièce pour quel ticket ?)
CREATE INDEX IF NOT EXISTS idx_stock_mov_ticket ON stock_movements("ticketId");

-- Commentaire pour la maintenance
COMMENT ON COLUMN stock_movements."ticketId" IS 'Identifiant du ticket SAV lié à ce mouvement de stock (pour les sorties de type OUT).';
