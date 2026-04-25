-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "minDaysAdvance" INTEGER,
    "maxDaysAdvance" INTEGER,
    "minOccupancyPct" INTEGER,
    "maxOccupancyPct" INTEGER,
    "daysOfWeek" JSONB,
    "minGroupSize" INTEGER,
    "loyaltyTiers" JSONB,
    "destinationIds" JSONB,
    "categoryIds" JSONB,
    "adjustmentType" TEXT NOT NULL,
    "adjustmentValue" INTEGER NOT NULL,
    "maxDiscount" INTEGER,
    "minPrice" INTEGER,
    "stackable" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT,
    "destinationId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "basePriceCents" INTEGER NOT NULL,
    "finalPriceCents" INTEGER NOT NULL,
    "rulesApplied" JSONB NOT NULL,
    "occupancyPct" INTEGER,
    "daysAdvance" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PricingRule_tenantId_idx" ON "PricingRule"("tenantId");

-- CreateIndex
CREATE INDEX "PricingRule_tenantId_active_idx" ON "PricingRule"("tenantId", "active");

-- CreateIndex
CREATE INDEX "PriceHistory_tenantId_date_idx" ON "PriceHistory"("tenantId", "date");

-- CreateIndex
CREATE INDEX "PriceHistory_tenantId_productId_idx" ON "PriceHistory"("tenantId", "productId");

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
