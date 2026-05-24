-- Migration v55: Add interventionLocation column to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS "interventionLocation" TEXT DEFAULT 'à l\'atelier';
