-- Suppression forcée pour garantir la présence de la colonne fixed_cost
DROP TABLE IF EXISTS prestations CASCADE;

CREATE TABLE prestations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    fixed_cost NUMERIC DEFAULT 0
);

-- Données initiales
INSERT INTO prestations (id, name, fixed_cost) VALUES
('P1', 'Livraison & Mise en service', 15000),
('P2', 'Installation Standard', 25000),
('P3', 'Maintenance Préventive', 35000);
