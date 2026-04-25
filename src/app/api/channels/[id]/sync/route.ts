import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "channels:sync" });

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  try {
    const channel = await prisma.channel.findFirst({ where: { id, tenantId } });
    if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!channel.syncEnabled) {
      return NextResponse.json({ error: "Sync disabled for this channel" }, { status: 400 });
    }

    // Stub: real sync would fan out per channel.type to OTA APIs.
    // Here we just touch lastSyncAt and return mapping count as the synced unit.
    const mappingCount = await prisma.channelMapping.count({ where: { channelId: id } });

    const updated = await prisma.channel.update({
      where: { id },
      data: { lastSyncAt: new Date() },
    });

    log.info({ tenantId, channelId: id, mappingCount }, "Channel sync triggered");
    return NextResponse.json({
      success: true,
      lastSyncAt: updated.lastSyncAt,
      synced: mappingCount,
    });
  } catch (error) {
    log.error({ error, tenantId, id }, "Failed to trigger channel sync");
    return NextResponse.json({ error: "Failed to trigger sync" }, { status: 500 });
  }
}
