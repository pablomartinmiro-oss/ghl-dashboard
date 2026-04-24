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

const createSchema = z.object({
  name: z.string().min(1).max(160),
  code: z.string().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/),
  type: z.enum(TYPES),
  value: z.number().int().min(0).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  maxUses: z.number().int().min(0).nullable().optional(),
  minOrderCents: z.number().int().min(0).nullable().optional(),
  applicableTo: applicableSchema.optional(),
  status: z.enum(STATUSES).optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");

  const where: Prisma.PromotionWhereInput = { tenantId };
  if (status) where.status = status;

  const promotions = await prisma.promotion.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ promotions });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/marketing/promotions" });

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const d = parsed.data;

    const code = d.code.toUpperCase();
    const dup = await prisma.promotion.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });
    if (dup) {
      return NextResponse.json(
        { error: "Promotion code already exists" },
        { status: 409 }
      );
    }

    const promotion = await prisma.promotion.create({
      data: {
        tenantId,
        name: d.name,
        code,
        type: d.type,
        value: d.value ?? null,
        description: d.description ?? null,
        validFrom: new Date(d.validFrom),
        validUntil: new Date(d.validUntil),
        maxUses: d.maxUses ?? null,
        minOrderCents: d.minOrderCents ?? null,
        applicableTo: (d.applicableTo ?? null) as Prisma.InputJsonValue,
        status: d.status ?? "active",
      },
    });

    log.info({ promotionId: promotion.id }, "Promotion created");
    return NextResponse.json({ promotion }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Failed to create promotion");
    return NextResponse.json(
      { error: "Failed to create promotion" },
      { status: 500 }
    );
  }
}
