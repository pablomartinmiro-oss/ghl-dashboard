import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
      source: body.source ?? "api",
      customerName: body.customerName ?? "",
      customerEmail: body.customerEmail ?? "",
      customerPhone: body.customerPhone ?? null,
      destination: body.destination ?? null,
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      endDate: body.endDate ? new Date(body.endDate) : new Date(),
      partySize: body.partySize ?? 1,
      products: body.products ?? [],
      totalAmount: body.totalAmount ?? 0,
      currency: body.currency ?? "EUR",
      status: "pending",
      metadata: body.metadata ?? {},
    },
  });

  return NextResponse.json({ data: booking }, { status: 201 });
}
