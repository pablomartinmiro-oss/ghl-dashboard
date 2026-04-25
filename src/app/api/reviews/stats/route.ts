import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;

  const [total, pending, approved, featured, rejected, agg, byRating, byDestRaw] =
    await Promise.all([
      prisma.review.count({ where: { tenantId } }),
      prisma.review.count({ where: { tenantId, status: "pending" } }),
      prisma.review.count({ where: { tenantId, status: "approved" } }),
      prisma.review.count({ where: { tenantId, status: "featured" } }),
      prisma.review.count({ where: { tenantId, status: "rejected" } }),
      prisma.review.aggregate({
        where: { tenantId, status: { in: ["approved", "featured"] } },
        _avg: { rating: true },
      }),
      prisma.review.groupBy({
        by: ["rating"],
        where: { tenantId },
        _count: { _all: true },
      }),
      prisma.review.groupBy({
        by: ["destinationId"],
        where: {
          tenantId,
          destinationId: { not: null },
          status: { in: ["approved", "featured"] },
        },
        _count: { _all: true },
        _avg: { rating: true },
      }),
    ]);

  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  for (const r of byRating) {
    const k = r.rating as 1 | 2 | 3 | 4 | 5;
    if (k >= 1 && k <= 5) distribution[k] = r._count._all;
  }

  const destIds = byDestRaw
    .map((d) => d.destinationId)
    .filter((id): id is string => Boolean(id));
  const dests = destIds.length
    ? await prisma.destination.findMany({
        where: { id: { in: destIds }, tenantId },
        select: { id: true, name: true },
      })
    : [];
  const destMap = new Map(dests.map((d) => [d.id, d.name]));

  const byDestination = byDestRaw
    .map((d) => ({
      destinationId: d.destinationId,
      name: d.destinationId ? destMap.get(d.destinationId) ?? "—" : "—",
      count: d._count._all,
      avgRating: d._avg.rating ?? 0,
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    total,
    pending,
    approved,
    featured,
    rejected,
    avgRating: agg._avg.rating ?? 0,
    distribution,
    byDestination,
  });
}
