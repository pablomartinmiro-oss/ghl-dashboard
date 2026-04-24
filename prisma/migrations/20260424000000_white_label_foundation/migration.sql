-- AlterTable: enabledModules JSON on Tenant
ALTER TABLE "Tenant" ADD COLUMN "enabledModules" JSONB DEFAULT '{"crm":true,"reservations":true,"quotes":true,"catalog":true,"communications":true,"pipeline":true}';

-- CreateTable: Destination
CREATE TABLE "Destination" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'ES',
    "region" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Destination_tenantId_slug_key" ON "Destination"("tenantId", "slug");
CREATE INDEX "Destination_tenantId_idx" ON "Destination"("tenantId");

ALTER TABLE "Destination" ADD CONSTRAINT "Destination_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: Supplier
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cif" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "contactName" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Supplier_tenantId_slug_key" ON "Supplier"("tenantId", "slug");
CREATE INDEX "Supplier_tenantId_idx" ON "Supplier"("tenantId");

ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: ServiceCategory
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceCategory_tenantId_slug_key" ON "ServiceCategory"("tenantId", "slug");
CREATE INDEX "ServiceCategory_tenantId_idx" ON "ServiceCategory"("tenantId");

ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: TenantBranding
CREATE TABLE "TenantBranding" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#E87B5A',
    "secondaryColor" TEXT,
    "accentColor" TEXT,
    "tagline" TEXT,
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "cif" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "locale" TEXT NOT NULL DEFAULT 'es-ES',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantBranding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantBranding_tenantId_key" ON "TenantBranding"("tenantId");

ALTER TABLE "TenantBranding" ADD CONSTRAINT "TenantBranding_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Product add optional relations
ALTER TABLE "Product" ADD COLUMN "destinationId" TEXT;
ALTER TABLE "Product" ADD COLUMN "supplierId" TEXT;
ALTER TABLE "Product" ADD COLUMN "serviceCategoryId" TEXT;

CREATE INDEX "Product_destinationId_idx" ON "Product"("destinationId");
CREATE INDEX "Product_supplierId_idx" ON "Product"("supplierId");
CREATE INDEX "Product_serviceCategoryId_idx" ON "Product"("serviceCategoryId");

ALTER TABLE "Product" ADD CONSTRAINT "Product_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_serviceCategoryId_fkey" FOREIGN KEY ("serviceCategoryId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
