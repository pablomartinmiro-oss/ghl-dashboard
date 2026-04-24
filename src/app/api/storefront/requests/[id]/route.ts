import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const VALID_STATUS = ["pending", "contacted", "quoted", "confirmed", "cancelled"] as const;

const patchSchema = z.object({
  status: z.enum(VALID_STATUS).optional(),
  notes: z.string().max(2000).nullable().optional(),
  totalCents: z.number().int().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { id } = await params;
  const log = logger.child({ tenantId, path: "/api/storefront/requests/[id]", id });

  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.issues },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const existing = await prisma.bookingRequest.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    const updated = await prisma.bookingRequest.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.totalCents !== undefined && { totalCents: data.totalCents }),
      },
    });

    log.info({ status: updated.status }, "Booking request updated");
    return NextResponse.json({ request: updated });
  } catch (error) {
    log.error({ error }, "Failed to update booking request");
    return NextResponse.json({ error: "Error al actualizar la solicitud" }, { status: 500 });
  }
}
