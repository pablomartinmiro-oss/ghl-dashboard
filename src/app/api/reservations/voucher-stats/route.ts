import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { hasPermission } from "@/lib/auth/permissions";
import type { PermissionKey } from "@/types/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions as PermissionKey[], "reservations:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/reservations/voucher-stats" });

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfWeek = new Date(now);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Pending (not redeemed, source groupon)
    const pendientes = await prisma.reservation.count({
      where: {
        tenantId,
        source: "groupon",
        voucherRedeemed: false,
        status: { not: "cancelada" },
      },
    });

    // Redeemed this month
    const canjeados = await prisma.reservation.count({
      where: {
        tenantId,
        source: "groupon",
        voucherRedeemed: true,
        voucherRedeemedAt: { gte: startOfMonth },
      },
    });

    // Revenue this month (Groupon)
    const revenueResult = await prisma.reservation.aggregate({
      where: {
        tenantId,
        source: "groupon",
        voucherRedeemed: true,
        createdAt: { gte: startOfMonth },
      },
      _sum: { voucherPricePaid: true },
    });

    // Expiring this week
    const caducanSemana = await prisma.reservation.count({
      where: {
        tenantId,
        source: "groupon",
        voucherRedeemed: false,
        voucherExpiry: { gte: now, lte: endOfWeek },
        status: { not: "cancelada" },
      },
    });

    // Expiring this month
    const caducanMes = await prisma.reservation.count({
      where: {
        tenantId,
        source: "groupon",
        voucherRedeemed: false,
        voucherExpiry: { gte: now, lte: endOfMonth },
        status: { not: "cancelada" },
      },
    });

    // Get expiring voucher details (next 7 days)
    const expiring = await prisma.reservation.findMany({
      where: {
        tenantId,
        source: "groupon",
        voucherRedeemed: false,
        voucherExpiry: { gte: now, lte: endOfWeek },
        status: { not: "cancelada" },
      },
      select: {
        id: true,
        clientName: true,
        clientPhone: true,
        voucherExpiry: true,
        voucherCouponCode: true,
      },
      orderBy: { voucherExpiry: "asc" },
      take: 20,
    });

    log.info("Voucher stats fetched");
    return NextResponse.json({
      pendientes,
      canjeados,
      ingresosMes: revenueResult._sum.voucherPricePaid ?? 0,
      caducanSemana,
      caducanMes,
      expiring,
    });
  } catch (error) {
    log.error({ error }, "Failed to fetch voucher stats");
    return NextResponse.json({ error: "Failed to fetch voucher stats" }, { status: 500 });
  }
}
