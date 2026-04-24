-- CreateTable: StorefrontConfig
CREATE TABLE "StorefrontConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT NOT NULL,
    "heroTitle" TEXT,
    "heroSubtitle" TEXT,
    "heroImageUrl" TEXT,
    "aboutText" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "socialLinks" JSONB,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "customCss" TEXT,
    "showPrices" BOOLEAN NOT NULL DEFAULT true,
    "allowBookings" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorefrontConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StorefrontConfig_tenantId_key" ON "StorefrontConfig"("tenantId");
CREATE UNIQUE INDEX "StorefrontConfig_slug_key" ON "StorefrontConfig"("slug");

ALTER TABLE "StorefrontConfig" ADD CONSTRAINT "StorefrontConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: BookingRequest
CREATE TABLE "BookingRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "productIds" JSONB NOT NULL,
    "destinationId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "guests" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "promoCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalCents" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BookingRequest_tenantId_idx" ON "BookingRequest"("tenantId");
CREATE INDEX "BookingRequest_tenantId_status_idx" ON "BookingRequest"("tenantId", "status");

ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
