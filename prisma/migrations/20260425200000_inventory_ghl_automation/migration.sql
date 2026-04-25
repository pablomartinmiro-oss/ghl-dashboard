-- CreateTable
CREATE TABLE "InventoryCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sizeType" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "size" TEXT NOT NULL,
    "serialNumber" TEXT,
    "condition" TEXT NOT NULL DEFAULT 'good',
    "purchaseDate" TIMESTAMP(3),
    "purchaseCents" INTEGER,
    "seasonsPurchased" INTEGER NOT NULL DEFAULT 0,
    "totalRentals" INTEGER NOT NULL DEFAULT 0,
    "lastMaintenance" TIMESTAMP(3),
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReservation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "reservationId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'reserved',
    "checkedOutAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "damageNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceLog" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "cost" INTEGER,
    "performedBy" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextDueAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "MaintenanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SizingProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "heightCm" INTEGER,
    "weightKg" INTEGER,
    "shoeSize" TEXT,
    "age" INTEGER,
    "level" TEXT,
    "skiLength" TEXT,
    "bootSize" TEXT,
    "helmetSize" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SizingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GHLAutomationConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "autoSyncFields" BOOLEAN NOT NULL DEFAULT true,
    "autoCreateOpps" BOOLEAN NOT NULL DEFAULT true,
    "autoSendTriggers" BOOLEAN NOT NULL DEFAULT true,
    "workflowBookingConfirmed" TEXT,
    "workflowBookingReminder" TEXT,
    "workflowPostTrip" TEXT,
    "workflowReviewRequest" TEXT,
    "workflowLoyaltyUpgrade" TEXT,
    "workflowEquipmentReady" TEXT,
    "workflowAbandonedCart" TEXT,
    "pipelineName" TEXT DEFAULT 'Reservas',
    "stageNuevoLead" TEXT DEFAULT 'Nuevo Lead',
    "stagePresupuestoEnviado" TEXT DEFAULT 'Presupuesto Enviado',
    "stageReservaConfirmada" TEXT DEFAULT 'Reserva Confirmada',
    "stagePagado" TEXT DEFAULT 'Pagado',
    "stageCompletado" TEXT DEFAULT 'Completado',
    "stageResenaRecibida" TEXT DEFAULT 'Reseña Recibida',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GHLAutomationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryCategory_tenantId_idx" ON "InventoryCategory"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCategory_tenantId_slug_key" ON "InventoryCategory"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "InventoryItem_tenantId_status_idx" ON "InventoryItem"("tenantId", "status");

-- CreateIndex
CREATE INDEX "InventoryItem_tenantId_destinationId_idx" ON "InventoryItem"("tenantId", "destinationId");

-- CreateIndex
CREATE INDEX "InventoryItem_tenantId_categoryId_idx" ON "InventoryItem"("tenantId", "categoryId");

-- CreateIndex
CREATE INDEX "InventoryItem_serialNumber_idx" ON "InventoryItem"("serialNumber");

-- CreateIndex
CREATE INDEX "InventoryReservation_tenantId_idx" ON "InventoryReservation"("tenantId");

-- CreateIndex
CREATE INDEX "InventoryReservation_tenantId_startDate_endDate_idx" ON "InventoryReservation"("tenantId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "InventoryReservation_itemId_idx" ON "InventoryReservation"("itemId");

-- CreateIndex
CREATE INDEX "MaintenanceLog_itemId_idx" ON "MaintenanceLog"("itemId");

-- CreateIndex
CREATE INDEX "SizingProfile_tenantId_idx" ON "SizingProfile"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SizingProfile_tenantId_customerEmail_key" ON "SizingProfile"("tenantId", "customerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "GHLAutomationConfig_tenantId_key" ON "GHLAutomationConfig"("tenantId");

-- AddForeignKey
ALTER TABLE "InventoryCategory" ADD CONSTRAINT "InventoryCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InventoryCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SizingProfile" ADD CONSTRAINT "SizingProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GHLAutomationConfig" ADD CONSTRAINT "GHLAutomationConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
