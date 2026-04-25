import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiKey } from "@/lib/api-auth/verify";

export async function POST(request: NextRequest) {
  const auth = await verifyApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  const booking = await prisma.bookingRequest.create({
    data: {
      tenantId: auth.tenantId,
      customerName: body.customerName ?? "",
      customerEmail: body.customerEmail ?? "",
      customerPhone: body.customerPhone ?? null,
      destinationId: body.destinationId ?? null,
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      endDate: body.endDate ? new Date(body.endDate) : new Date(),
      guests: body.guests ?? body.partySize ?? 1,
      productIds: body.productIds ?? body.products ?? [],
      totalCents: body.totalCents ?? null,
      status: "pending",
      metadata: { ...(body.metadata ?? {}), source: body.source ?? "api" },
    },
  });

  return NextResponse.json({ data: booking }, { status: 201 });
}
