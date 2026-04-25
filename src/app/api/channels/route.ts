import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { Prisma } from "@/generated/prisma/client";

const log = logger.child({ route: "channels" });

const createSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9_-]+$/),
  type: z.enum(["ota", "voucher", "direct", "b2b", "marketplace"]),
  enabled: z.boolean().optional(),
  commissionPct: z.number().min(0).max(100).optional(),
  apiConfig: z.record(z.string(), z.unknown()).nullable().optional(),
  syncEnabled: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const sp = request.nextUrl.searchParams;

  try {
    const where: Prisma.ChannelWhereInput = { tenantId };
    const enabled = sp.get("enabled");
    const type = sp.get("type");
    if (enabled === "true") where.enabled = true;
    if (enabled === "false") where.enabled = false;
    if (type) where.type = type;

    const channels = await prisma.channel.findMany({
      where,
      include: { _count: { select: { mappings: true } } },
      orderBy: [{ enabled: "desc" }, { name: "asc" }],
    });
    return NextResponse.json({ channels });
  } catch (error) {
    log.error({ error, tenantId }, "Failed to fetch channels");
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }
    const d = parsed.data;

    const channel = await prisma.channel.create({
      data: {
        tenantId,
        name: d.name,
        slug: d.slug,
        type: d.type,
        enabled: d.enabled ?? true,
        commissionPct: d.commissionPct ?? 0,
        apiConfig: d.apiConfig ? (JSON.parse(JSON.stringify(d.apiConfig)) as Prisma.InputJsonValue) : Prisma.JsonNull,
        syncEnabled: d.syncEnabled ?? false,
        metadata: d.metadata ? (JSON.parse(JSON.stringify(d.metadata)) as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    return NextResponse.json({ channel }, { status: 201 });
  } catch (error) {
    log.error({ error, tenantId }, "Failed to create channel");
    return NextResponse.json({ error: "Failed to create channel" }, { status: 500 });
  }
}
