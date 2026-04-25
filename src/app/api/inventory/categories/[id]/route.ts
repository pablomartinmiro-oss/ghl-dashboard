import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const SIZE_TYPES = ["length_cm", "eu_shoe", "head_cm", "generic_sml"] as const;

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-_]+$/).optional(),
  sizeType: z.enum(SIZE_TYPES).optional(),
  sortOrder: z.number().int().optional(),
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
    const existing = await prisma.inventoryCategory.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const category = await prisma.inventoryCategory.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json({ category });
  } catch (error) {
    logger.error({ error, tenantId, id }, "Failed to update inventory category");
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;
  try {
    const existing = await prisma.inventoryCategory.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.inventoryCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, tenantId, id }, "Failed to delete inventory category");
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
