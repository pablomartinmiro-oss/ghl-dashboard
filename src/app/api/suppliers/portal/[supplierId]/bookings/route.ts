import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getSupplierSession } from "@/lib/auth/supplier-token";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> }
) {
  const { supplierId } = await params;
  const log = logger.child({ path: `/api/suppliers/portal/${supplierId}/bookings` });

  const session = await getSupplierSession(request);
  if (!session || session.supplierId !== supplierId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session;

  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const items = await prisma.quoteItem.findMany({
      where: {
        product: { supplierId, tenantId },
        quote: { tenantId, status: "pagado", paidAt: { gte: since } },
      },
      select: {
        id: true,
        name: true,
        category: true,
        quantity: true,
        totalPrice: true,
        startDate: true,
        endDate: true,
        numDays: true,
        numPersons: true,
        station: true,
        quote: {
          select: {
            id: true,
            clientName: true,
            paidAt: true,
            destination: true,
          },
        },
      },
      orderBy: { quote: { paidAt: "desc" } },
      take: 100,
    });

    return NextResponse.json({ bookings: items });
  } catch (error) {
    log.error({ error }, "Failed to load supplier bookings");
    return NextResponse.json(
      { error: "Error al cargar reservas" },
      { status: 500 }
    );
  }
}
