-- Table pour les charges de l'atelier
CREATE TABLE IF NOT EXISTS workshop_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- 'Salaire', 'Loyer', 'Transport', 'Maintenance', 'Autre'
  amount DECIMAL(15,2) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  description TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Table pour les transferts de fonds (Caisse -> Manager/Coffre)
CREATE TABLE IF NOT EXISTS fund_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount DECIMAL(15,2) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'En attente', -- 'En attente', 'Validé', 'Rejeté'
  from_agent UUID REFERENCES auth.users(id),
  to_manager UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Activer RLS
ALTER TABLE workshop_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_transfers ENABLE ROW LEVEL SECURITY;

-- Autoriser tout pour les tests (à affiner en prod)
CREATE POLICY "Allow all for workshop_expenses" ON workshop_expenses FOR ALL USING (true);
CREATE POLICY "Allow all for fund_transfers" ON fund_transfers FOR ALL USING (true);
