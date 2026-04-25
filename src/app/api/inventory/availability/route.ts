import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const sp = request.nextUrl.searchParams;

  try {
    const startDateStr = sp.get("startDate");
    const endDateStr = sp.get("endDate");
    const categoryId = sp.get("categoryId");
    const destinationId = sp.get("destinationId");
    const size = sp.get("size");

    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ error: "startDate and endDate required" }, { status: 400 });
    }
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
      return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
    }

    const itemWhere: Prisma.InventoryItemWhereInput = {
      tenantId,
      status: { notIn: ["retired"] },
    };
    if (categoryId) itemWhere.categoryId = categoryId;
    if (destinationId) itemWhere.destinationId = destinationId;
    if (size) itemWhere.size = size;

    const items = await prisma.inventoryItem.findMany({
      where: itemWhere,
      include: {
        category: { select: { id: true, name: true, slug: true, sizeType: true } },
        destination: { select: { id: true, name: true, slug: true } },
        reservations: {
          where: {
            status: { in: ["reserved", "checked_out"] },
            startDate: { lt: endDate },
            endDate: { gt: startDate },
          },
          select: { id: true },
        },
      },
    });

    const available = items.filter((i) => i.reservations.length === 0 && i.status !== "maintenance");

    const bySize: Record<string, { available: number; total: number }> = {};
    for (const i of items) {
      const key = i.size;
      if (!bySize[key]) bySize[key] = { available: 0, total: 0 };
      bySize[key].total += 1;
      if (i.reservations.length === 0 && i.status !== "maintenance") bySize[key].available += 1;
    }

    return NextResponse.json({
      total: items.length,
      availableCount: available.length,
      bySize,
      items: available.map((i) => ({
        id: i.id,
        name: i.name,
        brand: i.brand,
        size: i.size,
        condition: i.condition,
        category: i.category,
        destination: i.destination,
      })),
    });
  } catch (error) {
    logger.error({ error, tenantId }, "Failed to compute availability");
    return NextResponse.json({ error: "Failed to compute availability" }, { status: 500 });
  }
}
