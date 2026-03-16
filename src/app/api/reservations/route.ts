import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/reservations" });
  const { searchParams } = request.nextUrl;

  const status = searchParams.get("status");
  const station = searchParams.get("station");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const search = searchParams.get("search");

  try {
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (station) where.station = station;
    if (dateFrom || dateTo) {
      where.activityDate = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
      };
    }
    if (search) {
      where.OR = [
        { clientName: { contains: search, mode: "insensitive" } },
        { clientEmail: { contains: search, mode: "insensitive" } },
        { clientPhone: { contains: search, mode: "insensitive" } },
        { couponCode: { contains: search, mode: "insensitive" } },
      ];
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: { quote: { select: { id: true, clientName: true } } },
      orderBy: { createdAt: "desc" },
    });

    log.info({ count: reservations.length }, "Reservations fetched");
    return NextResponse.json({ reservations });
  } catch (error) {
    log.error({ error }, "Failed to fetch reservations");
    return NextResponse.json(
      { error: "Failed to fetch reservations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/reservations" });

  try {
    const body = await request.json();
    const {
      clientName, clientPhone, clientEmail, couponCode,
      source, station, activityDate, schedule, language,
      participants, services,
      totalPrice, discount, paymentMethod, paymentRef,
      status: reservationStatus,
      notes, internalNotes,
      notificationType, quoteId,
    } = body as Record<string, unknown>;

    const reservation = await prisma.reservation.create({
      data: {
        tenantId,
        clientName: clientName as string,
        clientPhone: clientPhone as string,
        clientEmail: clientEmail as string,
        couponCode: couponCode as string | undefined,
        source: source as string,
        station: station as string,
        activityDate: new Date(activityDate as string),
        schedule: schedule as string,
        language: (language as string) || "es",
        participants: participants as object | undefined,
        services: services as object | undefined,
        totalPrice: Number(totalPrice) || 0,
        discount: Number(discount) || 0,
        paymentMethod: paymentMethod as string | undefined,
        paymentRef: paymentRef as string | undefined,
        status: (reservationStatus as string) || "pendiente",
        notes: notes as string | undefined,
        internalNotes: internalNotes as string | undefined,
        notificationType: notificationType as string | undefined,
        quoteId: quoteId as string | undefined,
        createdBy: session.user.id,
        emailSentAt: notificationType ? new Date() : undefined,
        whatsappSentAt: notificationType ? new Date() : undefined,
      },
    });

    // Update capacity if confirmed
    if (reservationStatus === "confirmada") {
      await updateCapacity(tenantId, station as string, activityDate as string, 1);
    }

    log.info({ reservationId: reservation.id, status: reservationStatus }, "Reservation created");
    return NextResponse.json({ reservation }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Failed to create reservation");
    return NextResponse.json(
      { error: "Failed to create reservation" },
      { status: 500 }
    );
  }
}

async function updateCapacity(tenantId: string, station: string, dateStr: string, delta: number) {
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);

  // Update all service type capacities for this station+date
  await prisma.stationCapacity.updateMany({
    where: { tenantId, station, date },
    data: { booked: { increment: delta } },
  });
}
