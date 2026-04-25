import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const STATUSES = ["available", "reserved", "rented", "maintenance", "retired"] as const;
const CONDITIONS = ["new", "good", "fair", "maintenance", "retired"] as const;

const patchSchema = z.object({
  categoryId: z.string().optional(),
  destinationId: z.string().optional(),
  name: z.string().min(1).max(200).optional(),
  brand: z.string().max(120).nullable().optional(),
  model: z.string().max(120).nullable().optional(),
  size: z.string().min(1).max(40).optional(),
  serialNumber: z.string().max(120).nullable().optional(),
  condition: z.enum(CONDITIONS).optional(),
  status: z.enum(STATUSES).optional(),
  purchaseDate: z.string().datetime().nullable().optional(),
  purchaseCents: z.number().int().nullable().optional(),
  seasonsPurchased: z.number().int().optional(),
  totalRentals: z.number().int().optional(),
  notes: z.string().max(2000).nullable().optional(),
  lastMaintenance: z.string().datetime().nullable().optional(),
});

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  try {
    const item = await prisma.inventoryItem.findFirst({
      where: { id, tenantId },
      include: {
        category: true,
        destination: { select: { id: true, name: true, slug: true } },
        reservations: {
          orderBy: { startDate: "desc" },
          take: 20,
        },
        maintenanceLogs: {
          orderBy: { performedAt: "desc" },
          take: 20,
        },
      },
    });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item });
  } catch (error) {
    logger.error({ error, tenantId, id }, "Failed to fetch inventory item");
    return NextResponse.json({ error: "Failed to fetch item" }, { status: 500 });
  }
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
    const existing = await prisma.inventoryItem.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const d = parsed.data;
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...d,
        purchaseDate: d.purchaseDate !== undefined ? (d.purchaseDate ? new Date(d.purchaseDate) : null) : undefined,
        lastMaintenance: d.lastMaintenance !== undefined ? (d.lastMaintenance ? new Date(d.lastMaintenance) : null) : undefined,
      },
    });
    return NextResponse.json({ item });
  } catch (error) {
    logger.error({ error, tenantId, id }, "Failed to update inventory item");
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  try {
    const existing = await prisma.inventoryItem.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.inventoryItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, tenantId, id }, "Failed to delete inventory item");
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
