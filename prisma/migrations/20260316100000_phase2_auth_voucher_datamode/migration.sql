-- Phase 2: Auth, Voucher, DataMode

-- User: add invite and email verification fields
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "inviteToken" TEXT;
ALTER TABLE "User" ADD COLUMN "inviteExpires" TIMESTAMP(3);
CREATE UNIQUE INDEX "User_inviteToken_key" ON "User"("inviteToken");

-- Tenant: add dataMode
ALTER TABLE "Tenant" ADD COLUMN "dataMode" TEXT NOT NULL DEFAULT 'mock';

-- Reservation: add voucher tracking fields
ALTER TABLE "Reservation" ADD COLUMN "voucherImageUrl" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "voucherSecurityCode" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "voucherCouponCode" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "voucherProduct" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "voucherPricePaid" DOUBLE PRECISION;
ALTER TABLE "Reservation" ADD COLUMN "voucherExpiry" TIMESTAMP(3);
ALTER TABLE "Reservation" ADD COLUMN "voucherRedeemedAt" TIMESTAMP(3);
ALTER TABLE "Reservation" ADD COLUMN "voucherRedeemed" BOOLEAN NOT NULL DEFAULT false;

-- GrouponProductMapping table
CREATE TABLE "GrouponProductMapping" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "grouponDesc" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "services" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrouponProductMapping_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GrouponProductMapping_tenantId_idx" ON "GrouponProductMapping"("tenantId");

ALTER TABLE "GrouponProductMapping" ADD CONSTRAINT "GrouponProductMapping_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
