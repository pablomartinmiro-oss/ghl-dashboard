import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> }
) {
  const { supplierId } = await params;

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: {
      id: true,
      name: true,
      tenantId: true,
      portalEnabled: true,
      isActive: true,
    },
  });

  if (!supplier || !supplier.isActive || !supplier.portalEnabled) {
    return NextResponse.json({ error: "Portal no disponible" }, { status: 404 });
  }

  return NextResponse.json({
    supplier: {
      id: supplier.id,
      name: supplier.name,
      tenantId: supplier.tenantId,
    },
  });
}
