import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const updateSchema = z.object({
  type: z.enum(["income", "expense", "supplier_settlement", "refund"]).optional(),
  category: z.enum(["reservation", "quote", "groupon", "supplier", "operational", "tax", "other"]).optional(),
  description: z.string().min(1).max(300).optional(),
  amountCents: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  date: z.string().datetime().optional(),
  referenceType: z.string().max(40).nullable().optional(),
  referenceId: z.string().max(60).nullable().optional(),
  supplierId: z.string().nullable().optional(),
  paymentMethod: z.string().max(40).nullable().optional(),
  status: z.enum(["pending", "confirmed", "cancelled"]).optional(),
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

  const transaction = await prisma.transaction.findFirst({
    where: { id, tenantId },
    include: { supplier: { select: { id: true, name: true } } },
  });
  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }
  return NextResponse.json({ transaction });
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
  const log = logger.child({ tenantId, path: `/api/accounting/transactions/${id}` });

  try {
    const existing = await prisma.transaction.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
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

    if (d.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: d.supplierId, tenantId },
      });
      if (!supplier) {
        return NextResponse.json({ error: "Supplier not found" }, { status: 400 });
      }
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...(d.type !== undefined && { type: d.type }),
        ...(d.category !== undefined && { category: d.category }),
        ...(d.description !== undefined && { description: d.description }),
        ...(d.amountCents !== undefined && { amountCents: d.amountCents }),
        ...(d.currency !== undefined && { currency: d.currency }),
        ...(d.date !== undefined && { date: new Date(d.date) }),
        ...(d.referenceType !== undefined && { referenceType: d.referenceType }),
        ...(d.referenceId !== undefined && { referenceId: d.referenceId }),
        ...(d.supplierId !== undefined && { supplierId: d.supplierId }),
        ...(d.paymentMethod !== undefined && { paymentMethod: d.paymentMethod }),
        ...(d.status !== undefined && { status: d.status }),
        ...(d.notes !== undefined && { notes: d.notes }),
      },
    });

    log.info({ transactionId: id }, "Transaction updated");
    return NextResponse.json({ transaction });
  } catch (error) {
    log.error({ error }, "Failed to update transaction");
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
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
  const log = logger.child({ tenantId, path: `/api/accounting/transactions/${id}` });

  const existing = await prisma.transaction.findFirst({ where: { id, tenantId } });
  if (!existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  await prisma.transaction.delete({ where: { id } });
  log.info({ transactionId: id }, "Transaction deleted");
  return NextResponse.json({ success: true });
}
