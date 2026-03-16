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
  const log = logger.child({ tenantId, path: "/api/quotes" });
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const destination = searchParams.get("destination");

  try {
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (destination) where.destination = destination;

    const quotes = await prisma.quote.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    log.info({ count: quotes.length }, "Quotes fetched");
    return NextResponse.json({ quotes });
  } catch (error) {
    log.error({ error }, "Failed to fetch quotes");
    return NextResponse.json(
      { error: "Failed to fetch quotes", code: "QUOTES_ERROR" },
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
  const log = logger.child({ tenantId, path: "/api/quotes" });

  try {
    const body = await request.json();
    const {
      clientName, clientEmail, clientPhone, clientNotes,
      destination, checkIn, checkOut, adults, children,
      wantsAccommodation, wantsForfait, wantsClases, wantsEquipment,
    } = body as Record<string, unknown>;

    const quote = await prisma.quote.create({
      data: {
        tenantId,
        clientName: clientName as string,
        clientEmail: (clientEmail as string) || null,
        clientPhone: (clientPhone as string) || null,
        clientNotes: (clientNotes as string) || null,
        destination: destination as string,
        checkIn: new Date(checkIn as string),
        checkOut: new Date(checkOut as string),
        adults: Number(adults) || 1,
        children: Number(children) || 0,
        wantsAccommodation: (wantsAccommodation as boolean) || false,
        wantsForfait: (wantsForfait as boolean) || false,
        wantsClases: (wantsClases as boolean) || false,
        wantsEquipment: (wantsEquipment as boolean) || false,
        status: "nuevo",
        totalAmount: 0,
      },
      include: { items: true },
    });

    log.info({ quoteId: quote.id }, "Quote created");
    return NextResponse.json({ quote }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Failed to create quote");
    return NextResponse.json(
      { error: "Failed to create quote" },
      { status: 500 }
    );
  }
}
