import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

const TYPES = ["percentage", "fixed", "2x1", "free_extra"] as const;
const STATUSES = ["active", "expired", "disabled"] as const;

const applicableSchema = z
  .object({
    categories: z.array(z.string()).optional(),
    products: z.array(z.string()).optional(),
    destinations: z.array(z.string()).optional(),
  })
  .nullable();

const updateSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  type: z.enum(TYPES).optional(),
  value: z.number().int().min(0).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  maxUses: z.number().int().min(0).nullable().optional(),
  minOrderCents: z.number().int().min(0).nullable().optional(),
  applicableTo: applicableSchema.optional(),
  status: z.enum(STATUSES).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { id } = await params;

  const promotion = await prisma.promotion.findFirst({
    where: { id, tenantId },
  });
  if (!promotion) {
    return NextResponse.json({ error: "Promotion not found" }, { status: 404 });
  }
  return NextResponse.json({ promotion });
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
  const log = logger.child({
    tenantId,
    path: `/api/marketing/promotions/${id}`,
  });

  try {
    const existing = await prisma.promotion.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Promotion not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const d = parsed.data;

    const data: Prisma.PromotionUpdateInput = {};
    if (d.name !== undefined) data.name = d.name;
    if (d.type !== undefined) data.type = d.type;
    if (d.value !== undefined) data.value = d.value;
    if (d.description !== undefined) data.description = d.description;
    if (d.validFrom !== undefined) data.validFrom = new Date(d.validFrom);
    if (d.validUntil !== undefined) data.validUntil = new Date(d.validUntil);
    if (d.maxUses !== undefined) data.maxUses = d.maxUses;
    if (d.minOrderCents !== undefined) data.minOrderCents = d.minOrderCents;
    if (d.applicableTo !== undefined) {
      data.applicableTo = (d.applicableTo ?? null) as Prisma.InputJsonValue;
    }
    if (d.status !== undefined) data.status = d.status;

    const promotion = await prisma.promotion.update({ where: { id }, data });
    log.info({ promotionId: id }, "Promotion updated");
    return NextResponse.json({ promotion });
  } catch (error) {
    log.error({ error }, "Failed to update promotion");
    return NextResponse.json(
      { error: "Failed to update promotion" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { id } = await params;
  const log = logger.child({
    tenantId,
    path: `/api/marketing/promotions/${id}`,
  });

  const existing = await prisma.promotion.findFirst({
    where: { id, tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Promotion not found" }, { status: 404 });
  }
  await prisma.promotion.delete({ where: { id } });
  log.info({ promotionId: id }, "Promotion deleted");
  return NextResponse.json({ success: true });
}
