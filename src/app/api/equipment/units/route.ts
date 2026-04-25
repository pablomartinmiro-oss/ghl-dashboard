import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { Prisma } from "@/generated/prisma/client";

const log = logger.child({ route: "equipment:units" });

const createSchema = z.object({
  serialNumber: z.string().min(1).max(100),
  brand: z.string().min(1).max(80),
  model: z.string().min(1).max(80),
  category: z.string().min(1).max(60),
  inventoryItemId: z.string().nullable().optional(),
  purchaseDate: z.string().datetime().nullable().optional(),
  purchaseCents: z.number().int().nullable().optional(),
  currentValue: z.number().int().nullable().optional(),
  condition: z.enum(["new", "good", "fair", "maintenance", "retired"]).optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const sp = request.nextUrl.searchParams;

  try {
    const where: Prisma.EquipmentUnitWhereInput = { tenantId };
    const condition = sp.get("condition");
    const category = sp.get("category");
    const includeRetired = sp.get("includeRetired") === "true";
    if (condition) where.condition = condition;
    if (category) where.category = category;
    if (!includeRetired) where.retiredAt = null;

    const units = await prisma.equipmentUnit.findMany({
      where,
      include: { _count: { select: { waivers: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ units });
  } catch (error) {
    log.error({ error, tenantId }, "Failed to fetch equipment units");
    return NextResponse.json({ error: "Failed to fetch units" }, { status: 500 });
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

    const unit = await prisma.equipmentUnit.create({
      data: {
        tenantId,
        serialNumber: d.serialNumber,
        brand: d.brand,
        model: d.model,
        category: d.category,
        inventoryItemId: d.inventoryItemId ?? null,
        purchaseDate: d.purchaseDate ? new Date(d.purchaseDate) : null,
        purchaseCents: d.purchaseCents ?? null,
        currentValue: d.currentValue ?? d.purchaseCents ?? null,
        condition: d.condition ?? "new",
        metadata: d.metadata
          ? (JSON.parse(JSON.stringify(d.metadata)) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });

    return NextResponse.json({ unit }, { status: 201 });
  } catch (error) {
    log.error({ error, tenantId }, "Failed to create equipment unit");
    return NextResponse.json({ error: "Failed to create unit" }, { status: 500 });
  }
}
