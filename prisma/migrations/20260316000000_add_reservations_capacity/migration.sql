-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ghlContactId" TEXT,
    "quoteId" TEXT,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "couponCode" TEXT,
    "source" TEXT NOT NULL,
    "station" TEXT NOT NULL,
    "activityDate" TIMESTAMP(3) NOT NULL,
    "schedule" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'es',
    "participants" JSONB,
    "services" JSONB,
    "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "paymentRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "notes" TEXT,
    "internalNotes" TEXT,
    "emailSentAt" TIMESTAMP(3),
    "whatsappSentAt" TIMESTAMP(3),
    "notificationType" TEXT,
    "calendarFileUrl" TEXT,
    "qrCodeUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationCapacity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "station" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "serviceType" TEXT NOT NULL,
    "maxCapacity" INTEGER NOT NULL,
    "booked" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StationCapacity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reservation_tenantId_status_idx" ON "Reservation"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Reservation_tenantId_activityDate_idx" ON "Reservation"("tenantId", "activityDate");

-- CreateIndex
CREATE INDEX "Reservation_tenantId_createdAt_idx" ON "Reservation"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StationCapacity_tenantId_station_date_serviceType_key" ON "StationCapacity"("tenantId", "station", "date", "serviceType");

-- CreateIndex
CREATE INDEX "StationCapacity_tenantId_station_idx" ON "StationCapacity"("tenantId", "station");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationCapacity" ADD CONSTRAINT "StationCapacity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
