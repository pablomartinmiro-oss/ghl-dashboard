import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { Prisma } from "@/generated/prisma/client";

const log = logger.child({ route: "groups:id" });

const patchSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  organizerName: z.string().min(1).max(120).optional(),
  organizerEmail: z.string().email().optional(),
  organizerPhone: z.string().max(40).nullable().optional(),
  type: z.enum(["school", "company", "club", "family", "other"]).optional(),
  estimatedSize: z.number().int().min(1).max(2000).optional(),
  destinationId: z.string().nullable().optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  depositCents: z.number().int().nullable().optional(),
  totalCents: z.number().int().nullable().optional(),
  discountPct: z.number().min(0).max(100).nullable().optional(),
  status: z.enum(["inquiry", "quoted", "confirmed", "in_progress", "completed", "cancelled"]).optional(),
  notes: z.string().max(5000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  const group = await prisma.groupBooking.findFirst({
    where: { id, tenantId },
    include: {
      destination: { select: { id: true, name: true, slug: true } },
      members: { orderBy: { createdAt: "asc" } },
      _count: { select: { members: true } },
    },
  });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ group });
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

    const existing = await prisma.groupBooking.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const d = parsed.data;
    const data: Prisma.GroupBookingUpdateInput = {};
    if (d.name !== undefined) data.name = d.name;
    if (d.organizerName !== undefined) data.organizerName = d.organizerName;
    if (d.organizerEmail !== undefined) data.organizerEmail = d.organizerEmail;
    if (d.organizerPhone !== undefined) data.organizerPhone = d.organizerPhone;
    if (d.type !== undefined) data.type = d.type;
    if (d.estimatedSize !== undefined) data.estimatedSize = d.estimatedSize;
    if (d.destinationId !== undefined) {
      data.destination = d.destinationId
        ? { connect: { id: d.destinationId } }
        : { disconnect: true };
    }
    if (d.startDate !== undefined) data.startDate = new Date(d.startDate);
    if (d.endDate !== undefined) data.endDate = d.endDate ? new Date(d.endDate) : null;
    if (d.depositCents !== undefined) data.depositCents = d.depositCents;
    if (d.totalCents !== undefined) data.totalCents = d.totalCents;
    if (d.discountPct !== undefined) data.discountPct = d.discountPct;
    if (d.status !== undefined) data.status = d.status;
    if (d.notes !== undefined) data.notes = d.notes;
    if (d.metadata !== undefined) {
      data.metadata = d.metadata === null
        ? Prisma.JsonNull
        : (JSON.parse(JSON.stringify(d.metadata)) as Prisma.InputJsonValue);
    }

    const group = await prisma.groupBooking.update({ where: { id }, data });
    return NextResponse.json({ group });
  } catch (error) {
    log.error({ error, tenantId, id }, "Failed to update group");
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  const existing = await prisma.groupBooking.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.groupBooking.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
