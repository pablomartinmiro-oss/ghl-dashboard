import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

const STATUSES = ["available", "reserved", "rented", "maintenance", "retired"] as const;
const CONDITIONS = ["new", "good", "fair", "maintenance", "retired"] as const;

const createSchema = z.object({
  categoryId: z.string().min(1),
  destinationId: z.string().min(1),
  name: z.string().min(1).max(200),
  brand: z.string().max(120).nullable().optional(),
  model: z.string().max(120).nullable().optional(),
  size: z.string().min(1).max(40),
  serialNumber: z.string().max(120).nullable().optional(),
  condition: z.enum(CONDITIONS).optional(),
  status: z.enum(STATUSES).optional(),
  purchaseDate: z.string().datetime().nullable().optional(),
  purchaseCents: z.number().int().nullable().optional(),
  seasonsPurchased: z.number().int().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const sp = request.nextUrl.searchParams;

  try {
    const where: Prisma.InventoryItemWhereInput = { tenantId };
    const categoryId = sp.get("categoryId");
    const destinationId = sp.get("destinationId");
    const status = sp.get("status");
    const size = sp.get("size");
    const search = sp.get("search");

    if (categoryId) where.categoryId = categoryId;
    if (destinationId) where.destinationId = destinationId;
    if (status) where.status = status;
    if (size) where.size = size;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { serialNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true, sizeType: true } },
        destination: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ name: "asc" }, { size: "asc" }],
      take: 1000,
    });

    return NextResponse.json({ items });
  } catch (error) {
    logger.error({ error, tenantId }, "Failed to fetch inventory items");
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
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

    const [cat, dest] = await Promise.all([
      prisma.inventoryCategory.findFirst({ where: { id: d.categoryId, tenantId } }),
      prisma.destination.findFirst({ where: { id: d.destinationId, tenantId } }),
    ]);
    if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 400 });
    if (!dest) return NextResponse.json({ error: "Destination not found" }, { status: 400 });

    const item = await prisma.inventoryItem.create({
      data: {
        tenantId,
        categoryId: d.categoryId,
        destinationId: d.destinationId,
        name: d.name,
        brand: d.brand ?? null,
        model: d.model ?? null,
        size: d.size,
        serialNumber: d.serialNumber ?? null,
        condition: d.condition ?? "good",
        status: d.status ?? "available",
        purchaseDate: d.purchaseDate ? new Date(d.purchaseDate) : null,
        purchaseCents: d.purchaseCents ?? null,
        seasonsPurchased: d.seasonsPurchased ?? 0,
        notes: d.notes ?? null,
      },
      include: {
        category: { select: { id: true, name: true, slug: true, sizeType: true } },
        destination: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    logger.error({ error, tenantId }, "Failed to create inventory item");
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}
