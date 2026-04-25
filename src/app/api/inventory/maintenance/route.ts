import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const TYPES = ["tuning", "waxing", "repair", "inspection", "edge_sharpen"] as const;

const createSchema = z.object({
  itemId: z.string().min(1),
  type: z.enum(TYPES),
  description: z.string().max(2000).nullable().optional(),
  cost: z.number().int().nullable().optional(),
  performedBy: z.string().max(120).nullable().optional(),
  nextDueAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  setItemAvailable: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const sp = request.nextUrl.searchParams;

  try {
    const itemId = sp.get("itemId");
    const itemFilter = itemId ? { id: itemId, tenantId } : { tenantId };
    const items = await prisma.inventoryItem.findMany({
      where: itemFilter,
      select: { id: true },
    });
    const itemIds = items.map((i) => i.id);
    if (!itemIds.length) return NextResponse.json({ logs: [] });

    const logs = await prisma.maintenanceLog.findMany({
      where: { itemId: { in: itemIds } },
      include: { item: { select: { id: true, name: true, size: true } } },
      orderBy: { performedAt: "desc" },
      take: 500,
    });
    return NextResponse.json({ logs });
  } catch (error) {
    logger.error({ error, tenantId }, "Failed to fetch maintenance logs");
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
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
    const item = await prisma.inventoryItem.findFirst({ where: { id: d.itemId, tenantId } });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const log = await prisma.maintenanceLog.create({
      data: {
        itemId: d.itemId,
        type: d.type,
        description: d.description ?? null,
        cost: d.cost ?? null,
        performedBy: d.performedBy ?? null,
        nextDueAt: d.nextDueAt ? new Date(d.nextDueAt) : null,
        notes: d.notes ?? null,
      },
    });

    await prisma.inventoryItem.update({
      where: { id: d.itemId },
      data: {
        lastMaintenance: log.performedAt,
        condition: d.setItemAvailable ? "good" : item.condition,
        status: d.setItemAvailable ? "available" : item.status,
      },
    });

    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    logger.error({ error, tenantId }, "Failed to create maintenance log");
    return NextResponse.json({ error: "Failed to create log" }, { status: 500 });
  }
}
