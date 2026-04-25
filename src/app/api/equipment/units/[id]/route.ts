import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { Prisma } from "@/generated/prisma/client";

const log = logger.child({ route: "equipment:units:id" });

const patchSchema = z.object({
  serialNumber: z.string().min(1).max(100).optional(),
  brand: z.string().min(1).max(80).optional(),
  model: z.string().min(1).max(80).optional(),
  category: z.string().min(1).max(60).optional(),
  inventoryItemId: z.string().nullable().optional(),
  purchaseDate: z.string().datetime().nullable().optional(),
  purchaseCents: z.number().int().nullable().optional(),
  currentValue: z.number().int().nullable().optional(),
  condition: z.enum(["new", "good", "fair", "maintenance", "retired"]).optional(),
  totalRentals: z.number().int().min(0).optional(),
  retire: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
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
    const existing = await prisma.equipmentUnit.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const d = parsed.data;
    const data: Prisma.EquipmentUnitUpdateInput = {};
    if (d.serialNumber !== undefined) data.serialNumber = d.serialNumber;
    if (d.brand !== undefined) data.brand = d.brand;
    if (d.model !== undefined) data.model = d.model;
    if (d.category !== undefined) data.category = d.category;
    if (d.inventoryItemId !== undefined) data.inventoryItemId = d.inventoryItemId;
    if (d.purchaseDate !== undefined) data.purchaseDate = d.purchaseDate ? new Date(d.purchaseDate) : null;
    if (d.purchaseCents !== undefined) data.purchaseCents = d.purchaseCents;
    if (d.currentValue !== undefined) data.currentValue = d.currentValue;
    if (d.condition !== undefined) data.condition = d.condition;
    if (d.totalRentals !== undefined) data.totalRentals = d.totalRentals;
    if (d.retire) {
      data.retiredAt = new Date();
      data.condition = "retired";
    }
    if (d.metadata !== undefined) {
      data.metadata = d.metadata === null
        ? Prisma.JsonNull
        : (JSON.parse(JSON.stringify(d.metadata)) as Prisma.InputJsonValue);
    }

    const unit = await prisma.equipmentUnit.update({ where: { id }, data });
    return NextResponse.json({ unit });
  } catch (error) {
    log.error({ error, tenantId, id }, "Failed to update equipment unit");
    return NextResponse.json({ error: "Failed to update unit" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  const existing = await prisma.equipmentUnit.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.equipmentUnit.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
