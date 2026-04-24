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

const createSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(TYPES),
  status: z.enum(STATUSES).optional(),
  subject: z.string().max(300).nullable().optional(),
  content: z.string().max(50_000).nullable().optional(),
  templateId: z.string().max(80).nullable().optional(),
  audienceFilter: z.unknown().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { searchParams } = request.nextUrl;

  const where: Prisma.CampaignWhereInput = { tenantId };
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  if (status) where.status = status;
  if (type) where.type = type;

  const campaigns = await prisma.campaign.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      subject: true,
      scheduledAt: true,
      startedAt: true,
      completedAt: true,
      stats: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { sends: true } },
    },
  });
  return NextResponse.json({ campaigns });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId, id: userId } = session.user;
  const log = logger.child({ tenantId, path: "/api/marketing/campaigns" });

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const d = parsed.data;

    const campaign = await prisma.campaign.create({
      data: {
        tenantId,
        name: d.name,
        type: d.type,
        status: d.status ?? "draft",
        subject: d.subject ?? null,
        content: d.content ?? null,
        templateId: d.templateId ?? null,
        audienceFilter: (d.audienceFilter ?? null) as Prisma.InputJsonValue,
        scheduledAt: d.scheduledAt ? new Date(d.scheduledAt) : null,
        createdBy: userId,
        stats: {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          unsubscribed: 0,
        },
      },
    });

    log.info({ campaignId: campaign.id }, "Campaign created");
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Failed to create campaign");
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}
