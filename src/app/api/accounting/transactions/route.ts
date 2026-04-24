import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const TX_TYPES = ["income", "expense", "supplier_settlement", "refund"] as const;
const TX_CATEGORIES = [
  "reservation", "quote", "groupon", "supplier", "operational", "tax", "other",
] as const;
const TX_STATUS = ["pending", "confirmed", "cancelled"] as const;

const createSchema = z.object({
  type: z.enum(TX_TYPES),
  category: z.enum(TX_CATEGORIES),
  description: z.string().min(1).max(300),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().length(3).optional(),
  date: z.string().datetime().optional(),
  referenceType: z.string().max(40).nullable().optional(),
  referenceId: z.string().max(60).nullable().optional(),
  supplierId: z.string().nullable().optional(),
  paymentMethod: z.string().max(40).nullable().optional(),
  status: z.enum(TX_STATUS).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { searchParams } = request.nextUrl;
  const log = logger.child({ tenantId, path: "/api/accounting/transactions" });

  try {
    const where: {
      tenantId: string;
      type?: string;
      category?: string;
      supplierId?: string;
      status?: string;
      date?: { gte?: Date; lte?: Date };
    } = { tenantId };

    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const supplierId = searchParams.get("supplierId");
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (type) where.type = type;
    if (category) where.category = category;
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 500,
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    log.error({ error }, "Failed to fetch transactions");
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/accounting/transactions" });

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

    if (data.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: data.supplierId, tenantId },
      });
      if (!supplier) {
        return NextResponse.json({ error: "Supplier not found" }, { status: 400 });
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        tenantId,
        type: data.type,
        category: data.category,
        description: data.description,
        amountCents: data.amountCents,
        currency: data.currency ?? "EUR",
        date: data.date ? new Date(data.date) : new Date(),
        referenceType: data.referenceType ?? null,
        referenceId: data.referenceId ?? null,
        supplierId: data.supplierId ?? null,
        paymentMethod: data.paymentMethod ?? null,
        status: data.status ?? "confirmed",
        notes: data.notes ?? null,
        createdBy: session.user.id ?? null,
      },
    });

    log.info({ transactionId: transaction.id }, "Transaction created");
    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Failed to create transaction");
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}
