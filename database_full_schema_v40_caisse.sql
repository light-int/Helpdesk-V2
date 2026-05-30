-- ==========================================================
-- ROYAL PLAZA HELPDESK - SCHEMA v40 (CAISSE & WORKFLOW TICKET)
-- ==========================================================

-- Pour permettre les acomptes, les paiements partiels et les avoirs.
-- Les champs sont généralement stockés dans le JSONB 'financials' 
-- de la table tickets, mais s'ils sont extraits pour des requêtes :
-- On peut ajouter des colonnes ou utiliser le jsonb_set dans le front,
-- car Supabase gère le JSONB nativement. Laissons le front l'écrire
-- directement dans `financials`.

-- Si l'on souhaite tracker les Avoirs ou les historiques d'acomptes
-- de manière indépendante plus tard, une nouvelle table sera nécessaire.
-- Pour l'instant, l'évolution se passe uniquement sur le schéma frontend 
-- `FinancialDetail` avec persistance via le jsonb 'financials'.

-- Rafraîchir le cache PostgREST si aucune altération de table n'est nécessaire.
NOTIFY pgrst, 'reload schema';
