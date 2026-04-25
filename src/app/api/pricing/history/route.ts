import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;

  const { searchParams } = request.nextUrl;
  const productId = searchParams.get("productId");
  const destinationId = searchParams.get("destinationId");
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") ?? "100", 10) || 100));

  try {
    const where: Prisma.PriceHistoryWhereInput = { tenantId };
    if (productId) where.productId = productId;
    if (destinationId) where.destinationId = destinationId;
    if (fromStr || toStr) {
      where.date = {};
      if (fromStr) where.date.gte = new Date(fromStr);
      if (toStr) where.date.lte = new Date(toStr);
    }

    const history = await prisma.priceHistory.findMany({
      where,
      orderBy: { date: "desc" },
      take: limit,
    });

    return NextResponse.json({ history });
  } catch (error) {
    logger.error({ error, tenantId }, "Failed to fetch price history");
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
