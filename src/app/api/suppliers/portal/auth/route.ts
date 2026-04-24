import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { signSupplierToken } from "@/lib/auth/supplier-token";

const schema = z.object({
  supplierId: z.string().min(1),
  pin: z.string().regex(/^\d{6}$/, "PIN must be 6 digits"),
});

export async function POST(request: NextRequest) {
  const log = logger.child({ path: "/api/suppliers/portal/auth" });

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const { supplierId, pin } = parsed.data;

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        isActive: true,
        portalEnabled: true,
        portalPin: true,
      },
    });

    if (
      !supplier ||
      !supplier.isActive ||
      !supplier.portalEnabled ||
      !supplier.portalPin ||
      supplier.portalPin !== pin
    ) {
      log.warn({ supplierId }, "Supplier portal login failed");
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    const token = await signSupplierToken(supplier.id, supplier.tenantId);
    log.info({ supplierId }, "Supplier portal login");
    return NextResponse.json({
      token,
      supplier: { id: supplier.id, name: supplier.name },
    });
  } catch (error) {
    log.error({ error }, "Supplier portal auth failed");
    return NextResponse.json({ error: "Error de autenticación" }, { status: 500 });
  }
}
