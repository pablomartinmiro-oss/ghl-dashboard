import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * POST /api/admin/clean-tenant
 * Removes all demo/seeded data from the current tenant.
 * Keeps: products, season calendar, cached GHL data.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.roleName !== "Owner") {
    return NextResponse.json({ error: "Forbidden — Owner role required" }, { status: 403 });
  }

  const tenantId = session.user.tenantId;
  const log = logger.child({ route: "clean-tenant", tenantId });

  try {
    const [reservations, quotes, capacity, notifications] = await Promise.all([
      prisma.reservation.deleteMany({ where: { tenantId } }),
      prisma.quote.deleteMany({ where: { tenantId } }),
      prisma.stationCapacity.deleteMany({ where: { tenantId } }),
      prisma.notification.deleteMany({ where: { tenantId } }),
    ]);

    log.info({
      reservations: reservations.count,
      quotes: quotes.count,
      capacity: capacity.count,
      notifications: notifications.count,
    }, "Tenant cleaned");

    return NextResponse.json({
      success: true,
      deleted: {
        reservations: reservations.count,
        quotes: quotes.count,
        capacity: capacity.count,
        notifications: notifications.count,
      },
    });
  } catch (error) {
    log.error({ error }, "Clean tenant failed");
    return NextResponse.json(
      { error: "Failed to clean tenant" },
      { status: 500 },
    );
  }
}
