import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getSupplierSession } from "@/lib/auth/supplier-token";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> }
) {
  const { supplierId } = await params;
  const log = logger.child({ path: `/api/suppliers/portal/${supplierId}/dashboard` });

  const session = await getSupplierSession(request);
  if (!session || session.supplierId !== supplierId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session;

  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [itemCount, paidItems, pendingSettlements, supplier] = await Promise.all([
      prisma.quoteItem.count({
        where: {
          product: { supplierId, tenantId },
          quote: { tenantId, status: "pagado", paidAt: { gte: since } },
        },
      }),
      prisma.quoteItem.findMany({
        where: {
          product: { supplierId, tenantId },
          quote: { tenantId, status: "pagado", paidAt: { gte: since } },
        },
        select: { totalPrice: true },
      }),
      prisma.supplierSettlement.findMany({
        where: {
          tenantId,
          supplierId,
          status: { in: ["draft", "sent", "confirmed"] },
        },
        select: { netCents: true },
      }),
      prisma.supplier.findFirst({
        where: { id: supplierId, tenantId },
        select: { id: true, name: true },
      }),
    ]);

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const revenueCents = Math.round(
      paidItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0) * 100
    );
    const pendingCents = pendingSettlements.reduce(
      (sum, s) => sum + s.netCents,
      0
    );

    return NextResponse.json({
      supplier,
      stats: {
        reservationsCount: itemCount,
        revenueCents,
        pendingSettlementsCount: pendingSettlements.length,
        pendingSettlementsCents: pendingCents,
      },
    });
  } catch (error) {
    log.error({ error }, "Failed to load supplier dashboard");
    return NextResponse.json(
      { error: "Error al cargar el dashboard" },
      { status: 500 }
    );
  }
}
