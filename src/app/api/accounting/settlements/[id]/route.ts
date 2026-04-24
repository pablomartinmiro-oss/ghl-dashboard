import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const updateSchema = z.object({
  status: z.enum(["draft", "sent", "confirmed", "paid"]).optional(),
  commissionPct: z.number().min(0).max(100).optional(),
  paidAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
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

  const settlement = await prisma.supplierSettlement.findFirst({
    where: { id, tenantId },
    include: { supplier: { select: { id: true, name: true } } },
  });
  if (!settlement) {
    return NextResponse.json({ error: "Settlement not found" }, { status: 404 });
  }

  // Include line items: matching transactions in period
  const items = await prisma.transaction.findMany({
    where: {
      tenantId,
      supplierId: settlement.supplierId,
      status: "confirmed",
      date: { gte: settlement.periodStart, lte: settlement.periodEnd },
    },
    orderBy: [{ date: "asc" }],
  });

  return NextResponse.json({ settlement, items });
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
  const log = logger.child({ tenantId, path: `/api/accounting/settlements/${id}` });

  try {
    const existing = await prisma.supplierSettlement.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Settlement not found" }, { status: 404 });
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

    const data: {
      status?: string;
      commissionPct?: number;
      commissionCents?: number;
      netCents?: number;
      paidAt?: Date | null;
      notes?: string | null;
    } = {};

    if (d.commissionPct !== undefined) {
      data.commissionPct = d.commissionPct;
      data.commissionCents = Math.round(existing.totalCents * (d.commissionPct / 100));
      data.netCents = existing.totalCents - data.commissionCents;
    }
    if (d.status !== undefined) {
      data.status = d.status;
      if (d.status === "paid" && !existing.paidAt) {
        data.paidAt = new Date();
      }
    }
    if (d.paidAt !== undefined) {
      data.paidAt = d.paidAt ? new Date(d.paidAt) : null;
    }
    if (d.notes !== undefined) {
      data.notes = d.notes;
    }

    const settlement = await prisma.supplierSettlement.update({
      where: { id },
      data,
    });

    log.info({ settlementId: id, status: settlement.status }, "Settlement updated");
    return NextResponse.json({ settlement });
  } catch (error) {
    log.error({ error }, "Failed to update settlement");
    return NextResponse.json({ error: "Failed to update settlement" }, { status: 500 });
  }
}
