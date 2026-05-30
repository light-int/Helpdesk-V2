-- Migration: Désarchiver les tickets clôturés pour les rendre visibles dans le tableau
UPDATE tickets 
SET "isArchived" = false 
WHERE status = 'Fermé' AND "isArchived" = true;
