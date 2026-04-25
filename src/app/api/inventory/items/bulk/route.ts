import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const bulkSchema = z.object({
  categoryId: z.string().min(1),
  destinationId: z.string().min(1),
  nameTemplate: z.string().min(1).max(200), // e.g., "Esquí Rossignol Experience"
  brand: z.string().max(120).optional(),
  model: z.string().max(120).optional(),
  size: z.string().min(1).max(40),
  quantity: z.number().int().min(1).max(200),
  condition: z.enum(["new", "good", "fair"]).optional(),
  serialPrefix: z.string().max(40).optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;

  try {
    const body = await request.json();
    const parsed = bulkSchema.safeParse(body);
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

    const existingCount = await prisma.inventoryItem.count({
      where: { tenantId, categoryId: d.categoryId, destinationId: d.destinationId },
    });

    const itemsData = Array.from({ length: d.quantity }).map((_, i) => {
      const idx = existingCount + i + 1;
      return {
        tenantId,
        categoryId: d.categoryId,
        destinationId: d.destinationId,
        name: `${d.nameTemplate} #${idx}`,
        brand: d.brand ?? null,
        model: d.model ?? null,
        size: d.size,
        serialNumber: d.serialPrefix ? `${d.serialPrefix}-${String(idx).padStart(4, "0")}` : null,
        condition: d.condition ?? "good",
        status: "available",
      };
    });

    const result = await prisma.inventoryItem.createMany({ data: itemsData });
    return NextResponse.json({ count: result.count }, { status: 201 });
  } catch (error) {
    logger.error({ error, tenantId }, "Failed to bulk create inventory items");
    return NextResponse.json({ error: "Failed to bulk create" }, { status: 500 });
  }
}
