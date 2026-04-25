import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

const log = logger.child({ route: "groups:templates:id" });

const patchSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  type: z.enum(["school", "company", "club", "family", "other"]).optional(),
  defaultSize: z.number().int().min(1).max(2000).optional(),
  defaultDays: z.number().int().min(1).max(60).optional(),
  includesEquipment: z.boolean().optional(),
  includesLessons: z.boolean().optional(),
  discountPct: z.number().min(0).max(100).nullable().optional(),
  pricePerPersonCents: z.number().int().nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
});

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
    const existing = await prisma.groupTemplate.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const d = parsed.data;
    const data: Prisma.GroupTemplateUpdateInput = {};
    if (d.name !== undefined) data.name = d.name;
    if (d.type !== undefined) data.type = d.type;
    if (d.defaultSize !== undefined) data.defaultSize = d.defaultSize;
    if (d.defaultDays !== undefined) data.defaultDays = d.defaultDays;
    if (d.includesEquipment !== undefined) data.includesEquipment = d.includesEquipment;
    if (d.includesLessons !== undefined) data.includesLessons = d.includesLessons;
    if (d.discountPct !== undefined) data.discountPct = d.discountPct;
    if (d.pricePerPersonCents !== undefined) data.pricePerPersonCents = d.pricePerPersonCents;
    if (d.description !== undefined) data.description = d.description;

    const template = await prisma.groupTemplate.update({ where: { id }, data });
    return NextResponse.json({ template });
  } catch (error) {
    log.error({ error, tenantId, id }, "Failed to update template");
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  const existing = await prisma.groupTemplate.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.groupTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
