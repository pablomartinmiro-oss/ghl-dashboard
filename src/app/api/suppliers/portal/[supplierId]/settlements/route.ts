import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getSupplierSession } from "@/lib/auth/supplier-token";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> }
) {
  const { supplierId } = await params;
  const log = logger.child({ path: `/api/suppliers/portal/${supplierId}/settlements` });

  const session = await getSupplierSession(request);
  if (!session || session.supplierId !== supplierId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session;

  try {
    const settlements = await prisma.supplierSettlement.findMany({
      where: { tenantId, supplierId },
      orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        periodStart: true,
        periodEnd: true,
        totalCents: true,
        commissionPct: true,
        commissionCents: true,
        netCents: true,
        status: true,
        paidAt: true,
        notes: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ settlements });
  } catch (error) {
    log.error({ error }, "Failed to load supplier settlements");
    return NextResponse.json(
      { error: "Error al cargar liquidaciones" },
      { status: 500 }
    );
  }
}
