-- Supplier portal auth fields
ALTER TABLE "Supplier" ADD COLUMN "portalEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Supplier" ADD COLUMN "portalPin" TEXT;
