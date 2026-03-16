import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: `/api/reservations/duplicate/${id}` });

  try {
    const source = await prisma.reservation.findFirst({
      where: { id, tenantId },
    });

    if (!source) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Copy all fields except id, timestamps, notification tracking
    const duplicate = await prisma.reservation.create({
      data: {
        tenantId,
        clientName: source.clientName,
        clientPhone: source.clientPhone,
        clientEmail: source.clientEmail,
        couponCode: source.couponCode,
        source: source.source,
        station: source.station,
        activityDate: source.activityDate,
        schedule: source.schedule,
        language: source.language,
        participants: source.participants as object | undefined,
        services: source.services as object | undefined,
        totalPrice: source.totalPrice,
        discount: source.discount,
        paymentMethod: source.paymentMethod,
        paymentRef: source.paymentRef,
        status: "pendiente",
        notes: source.notes,
        internalNotes: source.internalNotes,
        quoteId: source.quoteId,
        createdBy: session.user.id,
      },
    });

    log.info({ sourceId: id, duplicateId: duplicate.id }, "Reservation duplicated");
    return NextResponse.json({ reservation: duplicate }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Failed to duplicate reservation");
    return NextResponse.json({ error: "Failed to duplicate" }, { status: 500 });
  }
}
