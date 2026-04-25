import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

interface AudienceFilter {
  tags?: string[];
  lastActivityDays?: number;
}

interface CampaignStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { id } = await params;
  const log = logger.child({
    tenantId,
    path: `/api/marketing/campaigns/${id}/send`,
  });

  const campaign = await prisma.campaign.findFirst({
    where: { id, tenantId },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  if (campaign.status === "active" || campaign.status === "completed") {
    return NextResponse.json(
      { error: `Campaign already ${campaign.status}` },
      { status: 400 }
    );
  }

  const filter = (campaign.audienceFilter ?? {}) as AudienceFilter;
  const requireTags = (filter.tags ?? []).map((t) => t.toLowerCase());

  const since = filter.lastActivityDays
    ? new Date(Date.now() - filter.lastActivityDays * 86_400_000)
    : null;

  const contacts = await prisma.cachedContact.findMany({
    where: {
      tenantId,
      email: { not: null },
      ...(since ? { lastActivity: { gte: since } } : {}),
    },
    select: { id: true, name: true, email: true, tags: true },
    take: 5_000,
  });

  const recipients = contacts.filter((c) => {
    if (!c.email) return false;
    if (requireTags.length === 0) return true;
    const tags = Array.isArray(c.tags)
      ? (c.tags as unknown[]).map((t) => String(t).toLowerCase())
      : [];
    return requireTags.every((t) => tags.includes(t));
  });

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "No recipients found for audience filter" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.campaignSend.createMany({
      data: recipients.map((c) => ({
        campaignId: id,
        contactEmail: c.email!,
        contactName: c.name ?? null,
        status: "sent",
        sentAt: new Date(),
      })),
    });

    const stats: CampaignStats = {
      sent: recipients.length,
      delivered: recipients.length,
      opened: 0,
      clicked: 0,
      bounced: 0,
      unsubscribed: 0,
    };

    await tx.campaign.update({
      where: { id },
      data: {
        status: "active",
        startedAt: new Date(),
        stats: stats as unknown as Prisma.InputJsonValue,
      },
    });
  });

  log.info(
    { campaignId: id, recipients: recipients.length },
    "Campaign send queued"
  );
  return NextResponse.json({ success: true, queued: recipients.length });
}
