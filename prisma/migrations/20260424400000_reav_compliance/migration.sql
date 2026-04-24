-- CreateTable: REAVRegistry
CREATE TABLE "REAVRegistry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "registryNumber" TEXT,
    "communityCode" TEXT,
    "companyName" TEXT NOT NULL,
    "cif" TEXT,
    "registeredAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "insurancePolicy" TEXT,
    "insuranceExpiry" TIMESTAMP(3),
    "civilLiability" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "REAVRegistry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "REAVRegistry_tenantId_key" ON "REAVRegistry"("tenantId");

ALTER TABLE "REAVRegistry" ADD CONSTRAINT "REAVRegistry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: SafetyDocument
CREATE TABLE "SafetyDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "category" TEXT,
    "assignedTo" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SafetyDocument_tenantId_idx" ON "SafetyDocument"("tenantId");
CREATE INDEX "SafetyDocument_tenantId_type_idx" ON "SafetyDocument"("tenantId", "type");
CREATE INDEX "SafetyDocument_tenantId_status_idx" ON "SafetyDocument"("tenantId", "status");

ALTER TABLE "SafetyDocument" ADD CONSTRAINT "SafetyDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: IncidentReport
CREATE TABLE "IncidentReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "destinationId" TEXT,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "personsInvolved" TEXT,
    "actionsTaken" TEXT,
    "followUp" TEXT,
    "reportedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolution" TEXT,
    "closedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IncidentReport_tenantId_idx" ON "IncidentReport"("tenantId");
CREATE INDEX "IncidentReport_tenantId_date_idx" ON "IncidentReport"("tenantId", "date");

ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;
