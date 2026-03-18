-- Make Product.tenantId nullable (global catalog shared across all tenants)
ALTER TABLE "Product" ALTER COLUMN "tenantId" DROP NOT NULL;

-- Drop old tenant-scoped indexes
DROP INDEX IF EXISTS "Product_tenantId_station_category_idx";
DROP INDEX IF EXISTS "Product_tenantId_category_idx";

-- Create new global indexes
CREATE INDEX IF NOT EXISTS "Product_station_category_idx" ON "Product"("station", "category");
CREATE INDEX IF NOT EXISTS "Product_category_idx" ON "Product"("category");
