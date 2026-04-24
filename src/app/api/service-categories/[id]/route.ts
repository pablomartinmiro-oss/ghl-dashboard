import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-_]+$/).optional(),
  icon: z.string().max(60).nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { id } = await params;

  const category = await prisma.serviceCategory.findFirst({ where: { id, tenantId } });
  if (!category) {
    return NextResponse.json({ error: "Service category not found" }, { status: 404 });
  }
  return NextResponse.json({ category });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { id } = await params;
  const log = logger.child({ tenantId, path: `/api/service-categories/${id}` });

  try {
    const existing = await prisma.serviceCategory.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: "Service category not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }
    const data = parsed.data;

    const category = await prisma.serviceCategory.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    log.info({ categoryId: id }, "Service category updated");
    return NextResponse.json({ category });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una categoría con ese slug" }, { status: 409 });
    }
    log.error({ error }, "Failed to update service category");
    return NextResponse.json({ error: "Failed to update service category" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { id } = await params;
  const log = logger.child({ tenantId, path: `/api/service-categories/${id}` });

  const existing = await prisma.serviceCategory.findFirst({ where: { id, tenantId } });
  if (!existing) {
    return NextResponse.json({ error: "Service category not found" }, { status: 404 });
  }

  await prisma.serviceCategory.delete({ where: { id } });
  log.info({ categoryId: id }, "Service category deleted");
  return NextResponse.json({ success: true });
}
