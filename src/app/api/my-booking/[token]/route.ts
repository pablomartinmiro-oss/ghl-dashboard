import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const booking = await prisma.bookingRequest.findUnique({
    where: { id: token },
  });

  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      id: booking.id,
      customerName: booking.customerName,
      destinationId: booking.destinationId,
      startDate: booking.startDate,
      endDate: booking.endDate,
      guests: booking.guests,
      productIds: booking.productIds,
      status: booking.status,
      totalCents: booking.totalCents,
    },
  });
}
