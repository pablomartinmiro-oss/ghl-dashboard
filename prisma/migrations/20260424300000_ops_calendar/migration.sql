-- CreateTable: OpsEvent
CREATE TABLE "OpsEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "destinationId" TEXT,
    "supplierId" TEXT,
    "assignedTo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "color" TEXT,
    "reservationId" TEXT,
    "metadata" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OpsEvent_tenantId_date_idx" ON "OpsEvent"("tenantId", "date");
CREATE INDEX "OpsEvent_tenantId_destinationId_idx" ON "OpsEvent"("tenantId", "destinationId");
CREATE INDEX "OpsEvent_tenantId_type_idx" ON "OpsEvent"("tenantId", "type");

ALTER TABLE "OpsEvent" ADD CONSTRAINT "OpsEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpsEvent" ADD CONSTRAINT "OpsEvent_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OpsEvent" ADD CONSTRAINT "OpsEvent_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
