import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { Prisma } from "@/generated/prisma/client";

const log = logger.child({ route: "channels:id" });

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(["ota", "voucher", "direct", "b2b", "marketplace"]).optional(),
  enabled: z.boolean().optional(),
  commissionPct: z.number().min(0).max(100).optional(),
  apiConfig: z.record(z.string(), z.unknown()).nullable().optional(),
  syncEnabled: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  const channel = await prisma.channel.findFirst({
    where: { id, tenantId },
    include: { mappings: true, _count: { select: { mappings: true } } },
  });
  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ channel });
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }
    const existing = await prisma.channel.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const d = parsed.data;
    const data: Prisma.ChannelUpdateInput = {};
    if (d.name !== undefined) data.name = d.name;
    if (d.type !== undefined) data.type = d.type;
    if (d.enabled !== undefined) data.enabled = d.enabled;
    if (d.commissionPct !== undefined) data.commissionPct = d.commissionPct;
    if (d.syncEnabled !== undefined) data.syncEnabled = d.syncEnabled;
    if (d.apiConfig !== undefined) {
      data.apiConfig = d.apiConfig === null
        ? Prisma.JsonNull
        : (JSON.parse(JSON.stringify(d.apiConfig)) as Prisma.InputJsonValue);
    }
    if (d.metadata !== undefined) {
      data.metadata = d.metadata === null
        ? Prisma.JsonNull
        : (JSON.parse(JSON.stringify(d.metadata)) as Prisma.InputJsonValue);
    }

    const channel = await prisma.channel.update({ where: { id }, data });
    return NextResponse.json({ channel });
  } catch (error) {
    log.error({ error, tenantId, id }, "Failed to update channel");
    return NextResponse.json({ error: "Failed to update channel" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  const existing = await prisma.channel.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.channel.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
