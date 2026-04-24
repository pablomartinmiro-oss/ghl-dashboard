import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-_]+$/, "Slug must be lowercase letters, numbers, hyphens or underscores"),
  icon: z.string().max(60).nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/service-categories" });

  try {
    const categories = await prisma.serviceCategory.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ categories });
  } catch (error) {
    log.error({ error }, "Failed to fetch service categories");
    return NextResponse.json({ error: "Failed to fetch service categories" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/service-categories" });

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }
    const data = parsed.data;

    const category = await prisma.serviceCategory.create({
      data: {
        tenantId,
        name: data.name,
        slug: data.slug,
        icon: data.icon ?? null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });

    log.info({ categoryId: category.id }, "Service category created");
    return NextResponse.json({ category }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una categoría con ese slug" }, { status: 409 });
    }
    log.error({ error }, "Failed to create service category");
    return NextResponse.json({ error: "Failed to create service category" }, { status: 500 });
  }
}
