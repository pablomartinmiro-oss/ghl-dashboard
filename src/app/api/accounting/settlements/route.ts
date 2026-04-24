import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  supplierId: z.string().min(1),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  commissionPct: z.number().min(0).max(100).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { searchParams } = request.nextUrl;
  const log = logger.child({ tenantId, path: "/api/accounting/settlements" });

  try {
    const where: {
      tenantId: string;
      supplierId?: string;
      status?: string;
    } = { tenantId };
    const supplierId = searchParams.get("supplierId");
    const status = searchParams.get("status");
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;

    const settlements = await prisma.supplierSettlement.findMany({
      where,
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ settlements });
  } catch (error) {
    log.error({ error }, "Failed to fetch settlements");
    return NextResponse.json({ error: "Failed to fetch settlements" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/accounting/settlements" });

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const supplier = await prisma.supplier.findFirst({
      where: { id: data.supplierId, tenantId },
    });
    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 400 });
    }

    const periodStart = new Date(data.periodStart);
    const periodEnd = new Date(data.periodEnd);
    if (periodEnd < periodStart) {
      return NextResponse.json({ error: "periodEnd must be >= periodStart" }, { status: 400 });
    }

    // Auto-calculate from supplier transactions in period (income attributable to supplier)
    const matching = await prisma.transaction.findMany({
      where: {
        tenantId,
        supplierId: data.supplierId,
        status: "confirmed",
        date: { gte: periodStart, lte: periodEnd },
      },
      select: { type: true, amountCents: true },
    });

    let totalCents = 0;
    for (const t of matching) {
      if (t.type === "income") totalCents += t.amountCents;
      else if (t.type === "refund") totalCents -= t.amountCents;
    }

    const commissionPct = data.commissionPct ?? 0;
    const commissionCents = Math.round(totalCents * (commissionPct / 100));
    const netCents = totalCents - commissionCents;

    const settlement = await prisma.supplierSettlement.create({
      data: {
        tenantId,
        supplierId: data.supplierId,
        periodStart,
        periodEnd,
        totalCents,
        commissionPct,
        commissionCents,
        netCents,
        status: "draft",
        notes: data.notes ?? null,
      },
    });

    log.info({ settlementId: settlement.id }, "Settlement created");
    return NextResponse.json({ settlement }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Failed to create settlement");
    return NextResponse.json({ error: "Failed to create settlement" }, { status: 500 });
  }
}
