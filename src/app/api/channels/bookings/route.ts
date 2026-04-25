import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

const log = logger.child({ route: "channels:bookings" });

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const sp = request.nextUrl.searchParams;

  try {
    const where: Prisma.ChannelBookingWhereInput = { tenantId };
    const channelId = sp.get("channelId");
    const status = sp.get("status");
    if (channelId) where.channelId = channelId;
    if (status) where.status = status;

    const limit = Math.min(parseInt(sp.get("limit") ?? "100", 10), 500);

    const bookings = await prisma.channelBooking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const channels = await prisma.channel.findMany({
      where: { tenantId },
      select: { id: true, name: true, slug: true },
    });
    const channelMap = Object.fromEntries(channels.map((c) => [c.id, c]));

    return NextResponse.json({
      bookings: bookings.map((b) => ({ ...b, channel: channelMap[b.channelId] ?? null })),
    });
  } catch (error) {
    log.error({ error, tenantId }, "Failed to fetch channel bookings");
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}
