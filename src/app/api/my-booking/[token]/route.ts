import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      destination: booking.destination,
      startDate: booking.startDate,
      endDate: booking.endDate,
      partySize: booking.partySize,
      products: booking.products,
      status: booking.status,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
    },
  });
}
