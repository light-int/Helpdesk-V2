
-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v14 (FLUX D'INVENTAIRE)
-- ==========================================================

CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    "partId" TEXT REFERENCES parts(id) ON DELETE CASCADE,
    "partName" TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    type TEXT CHECK (type IN ('IN', 'OUT')) NOT NULL,
    reason TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "performedBy" TEXT
);

-- Indexation chronologique et par pièce
CREATE INDEX IF NOT EXISTS idx_stock_mov_date ON stock_movements(date);
CREATE INDEX IF NOT EXISTS idx_stock_mov_part ON stock_movements("partId");

-- RLS
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow Public Stock Movements Access" ON stock_movements FOR ALL USING (true) WITH CHECK (true);
