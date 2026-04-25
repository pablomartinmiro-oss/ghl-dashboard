import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const SIZE_TYPES = ["length_cm", "eu_shoe", "head_cm", "generic_sml"] as const;

const createSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-_]+$/),
  sizeType: z.enum(SIZE_TYPES),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  try {
    const categories = await prisma.inventoryCategory.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { items: true } } },
    });
    return NextResponse.json({ categories });
  } catch (error) {
    logger.error({ error, tenantId }, "Failed to fetch inventory categories");
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
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
    const category = await prisma.inventoryCategory.create({
      data: {
        tenantId,
        name: parsed.data.name,
        slug: parsed.data.slug,
        sizeType: parsed.data.sizeType,
        sortOrder: parsed.data.sortOrder ?? 0,
      },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    const err = error as { code?: string };
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una categoría con ese slug" }, { status: 409 });
    }
    logger.error({ error, tenantId }, "Failed to create inventory category");
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
