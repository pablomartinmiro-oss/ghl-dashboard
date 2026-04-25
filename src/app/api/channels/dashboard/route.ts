import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "channels:dashboard" });

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;

  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const channels = await prisma.channel.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });

    const grouped = await prisma.channelBooking.groupBy({
      by: ["channelId"],
      where: { tenantId, createdAt: { gte: monthStart }, status: { in: ["confirmed", "synced", "paid"] } },
      _sum: { totalCents: true, commissionCents: true },
      _count: { _all: true },
    });

    const byChannel = grouped.reduce<Record<string, { totalCents: number; commissionCents: number; bookings: number }>>(
      (acc, g) => {
        acc[g.channelId] = {
          totalCents: g._sum.totalCents ?? 0,
          commissionCents: g._sum.commissionCents ?? 0,
          bookings: g._count._all,
        };
        return acc;
      },
      {}
    );

    const channelStats = channels.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      type: c.type,
      enabled: c.enabled,
      commissionPct: c.commissionPct,
      lastSyncAt: c.lastSyncAt,
      revenueCents: byChannel[c.id]?.totalCents ?? 0,
      commissionCents: byChannel[c.id]?.commissionCents ?? 0,
      bookings: byChannel[c.id]?.bookings ?? 0,
    }));

    const totalRevenueCents = channelStats.reduce((s, c) => s + c.revenueCents, 0);
    const totalCommissionCents = channelStats.reduce((s, c) => s + c.commissionCents, 0);
    const totalBookings = channelStats.reduce((s, c) => s + c.bookings, 0);
    const activeChannels = channels.filter((c) => c.enabled).length;

    return NextResponse.json({
      channels: channelStats,
      totalRevenueCents,
      totalCommissionCents,
      totalBookings,
      activeChannels,
    });
  } catch (error) {
    log.error({ error, tenantId }, "Failed to load channels dashboard");
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
