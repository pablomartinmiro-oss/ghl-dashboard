import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { tenantId } = session.user;

  try {
    const reservation = await prisma.reservation.findFirst({
      where: { id, tenantId },
      include: { quote: { select: { id: true, clientName: true } } },
    });

    if (!reservation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ reservation });
  } catch (error) {
    logger.error({ error, id }, "Failed to fetch reservation");
    return NextResponse.json({ error: "Failed to fetch reservation" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, reservationId: id });

  try {
    const existing = await prisma.reservation.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json() as Record<string, unknown>;

    const ALLOWED_FIELDS = [
      "status", "notes", "internalNotes", "notificationType",
      "clientName", "clientPhone", "clientEmail", "couponCode",
      "station", "activityDate", "schedule", "language",
      "totalPrice", "discount", "paymentMethod", "paymentRef",
    ] as const;

    const updateData: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }
    if (body.participants !== undefined) {
      updateData.participants = JSON.parse(JSON.stringify(body.participants));
    }
    if (body.services !== undefined) {
      updateData.services = JSON.parse(JSON.stringify(body.services));
    }

    // Track notification sending
    const status = updateData.status as string | undefined;
    if (status === "confirmada" || status === "sin_disponibilidad") {
      if (updateData.notificationType) {
        updateData.emailSentAt = new Date();
        updateData.whatsappSentAt = new Date();
      }
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data: updateData,
    });

    log.info({ status }, "Reservation updated");
    return NextResponse.json({ reservation });
  } catch (error) {
    log.error({ error }, "Failed to update reservation");
    return NextResponse.json({ error: "Failed to update reservation" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, reservationId: id });

  try {
    const existing = await prisma.reservation.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.reservation.delete({ where: { id } });

    log.info({ reservationId: id }, "Reservation deleted");
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ error }, "Failed to delete reservation");
    return NextResponse.json({ error: "Failed to delete reservation" }, { status: 500 });
  }
}
