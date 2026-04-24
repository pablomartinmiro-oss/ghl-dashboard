import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/accounting/summary" });

  try {
    const { searchParams } = request.nextUrl;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const supplierId = searchParams.get("supplierId");

    const where: {
      tenantId: string;
      status: string;
      supplierId?: string;
      date?: { gte?: Date; lte?: Date };
    } = { tenantId, status: "confirmed" };
    if (supplierId) where.supplierId = supplierId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      select: { type: true, category: true, amountCents: true },
    });

    let incomeCents = 0;
    let expenseCents = 0;
    const byCategory: Record<string, { incomeCents: number; expenseCents: number }> = {};

    for (const t of transactions) {
      const cat = t.category;
      if (!byCategory[cat]) byCategory[cat] = { incomeCents: 0, expenseCents: 0 };

      if (t.type === "income") {
        incomeCents += t.amountCents;
        byCategory[cat].incomeCents += t.amountCents;
      } else if (t.type === "expense" || t.type === "supplier_settlement") {
        expenseCents += t.amountCents;
        byCategory[cat].expenseCents += t.amountCents;
      } else if (t.type === "refund") {
        incomeCents -= t.amountCents;
        byCategory[cat].incomeCents -= t.amountCents;
      }
    }

    const grossMarginCents = incomeCents - expenseCents;
    const grossMarginPct = incomeCents > 0 ? (grossMarginCents / incomeCents) * 100 : 0;

    return NextResponse.json({
      summary: {
        incomeCents,
        expenseCents,
        grossMarginCents,
        grossMarginPct,
        transactionCount: transactions.length,
        byCategory,
        currency: "EUR",
      },
    });
  } catch (error) {
    log.error({ error }, "Failed to compute summary");
    return NextResponse.json({ error: "Failed to compute summary" }, { status: 500 });
  }
}
