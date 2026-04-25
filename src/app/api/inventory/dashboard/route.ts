import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;

  try {
    const [items, byDestination, byCategory, maintenanceDue] = await Promise.all([
      prisma.inventoryItem.groupBy({
        by: ["status"],
        where: { tenantId },
        _count: true,
      }),
      prisma.inventoryItem.groupBy({
        by: ["destinationId"],
        where: { tenantId },
        _count: true,
      }),
      prisma.inventoryItem.groupBy({
        by: ["categoryId"],
        where: { tenantId },
        _count: true,
      }),
      prisma.inventoryItem.count({
        where: {
          tenantId,
          OR: [
            { condition: "fair" },
            { status: "maintenance" },
          ],
        },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const r of items) statusCounts[r.status] = r._count;

    const destinations = await prisma.destination.findMany({
      where: { tenantId, id: { in: byDestination.map((b) => b.destinationId) } },
      select: { id: true, name: true },
    });
    const categories = await prisma.inventoryCategory.findMany({
      where: { tenantId, id: { in: byCategory.map((b) => b.categoryId) } },
      select: { id: true, name: true, slug: true },
    });

    const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      total,
      available: statusCounts.available ?? 0,
      reserved: statusCounts.reserved ?? 0,
      rented: statusCounts.rented ?? 0,
      maintenance: statusCounts.maintenance ?? 0,
      retired: statusCounts.retired ?? 0,
      maintenanceDue,
      byDestination: byDestination.map((b) => ({
        destinationId: b.destinationId,
        name: destinations.find((d) => d.id === b.destinationId)?.name ?? "—",
        count: b._count,
      })),
      byCategory: byCategory.map((b) => ({
        categoryId: b.categoryId,
        name: categories.find((c) => c.id === b.categoryId)?.name ?? "—",
        slug: categories.find((c) => c.id === b.categoryId)?.slug ?? "",
        count: b._count,
      })),
    });
  } catch (error) {
    logger.error({ error, tenantId }, "Failed to fetch inventory dashboard");
    return NextResponse.json({ error: "Failed to fetch dashboard" }, { status: 500 });
  }
}
