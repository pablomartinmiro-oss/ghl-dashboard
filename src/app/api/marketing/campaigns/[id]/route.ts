import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

const TYPES = ["email", "sms", "whatsapp", "push"] as const;
const STATUSES = [
  "draft",
  "scheduled",
  "active",
  "paused",
  "completed",
  "cancelled",
] as const;

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(TYPES).optional(),
  status: z.enum(STATUSES).optional(),
  subject: z.string().max(300).nullable().optional(),
  content: z.string().max(50_000).nullable().optional(),
  templateId: z.string().max(80).nullable().optional(),
  audienceFilter: z.unknown().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { id } = await params;

  const campaign = await prisma.campaign.findFirst({
    where: { id, tenantId },
    include: {
      sends: {
        orderBy: { createdAt: "desc" },
        take: 100,
      },
    },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  return NextResponse.json({ campaign });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { id } = await params;
  const log = logger.child({ tenantId, path: `/api/marketing/campaigns/${id}` });

  try {
    const existing = await prisma.campaign.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const d = parsed.data;

    const data: Prisma.CampaignUpdateInput = {};
    if (d.name !== undefined) data.name = d.name;
    if (d.type !== undefined) data.type = d.type;
    if (d.status !== undefined) data.status = d.status;
    if (d.subject !== undefined) data.subject = d.subject;
    if (d.content !== undefined) data.content = d.content;
    if (d.templateId !== undefined) data.templateId = d.templateId;
    if (d.audienceFilter !== undefined) {
      data.audienceFilter = (d.audienceFilter ?? null) as Prisma.InputJsonValue;
    }
    if (d.scheduledAt !== undefined) {
      data.scheduledAt = d.scheduledAt ? new Date(d.scheduledAt) : null;
    }

    const campaign = await prisma.campaign.update({ where: { id }, data });
    log.info({ campaignId: id }, "Campaign updated");
    return NextResponse.json({ campaign });
  } catch (error) {
    log.error({ error }, "Failed to update campaign");
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { id } = await params;
  const log = logger.child({ tenantId, path: `/api/marketing/campaigns/${id}` });

  const existing = await prisma.campaign.findFirst({
    where: { id, tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  await prisma.campaign.delete({ where: { id } });
  log.info({ campaignId: id }, "Campaign deleted");
  return NextResponse.json({ success: true });
}
