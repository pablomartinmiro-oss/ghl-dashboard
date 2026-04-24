import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/storefront/requests" });

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10) || 100, 500);

  try {
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;

    const [requests, counts] = await Promise.all([
      prisma.bookingRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.bookingRequest.groupBy({
        by: ["status"],
        where: { tenantId },
        _count: { _all: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const c of counts) statusCounts[c.status] = c._count._all;

    return NextResponse.json({ requests, statusCounts });
  } catch (error) {
    log.error({ error }, "Failed to fetch booking requests");
    return NextResponse.json({ error: "Error al cargar solicitudes" }, { status: 500 });
  }
}
