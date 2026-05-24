-- Migration v57: Ajout des colonnes device_type, reference, invoice_number dans warranties
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS "deviceType" TEXT;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS "reference" TEXT;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT;
