import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const bookingSchema = z.object({
  customerName: z.string().min(2).max(120),
  customerEmail: z.string().email().max(200),
  customerPhone: z.string().max(40).nullable().optional(),
  productIds: z.array(z.string().min(1)).max(50).default([]),
  destinationId: z.string().nullable().optional(),
  startDate: z.string().min(1),
  endDate: z.string().nullable().optional(),
  guests: z.number().int().min(1).max(99).default(1),
  notes: z.string().max(2000).nullable().optional(),
  promoCode: z.string().max(40).nullable().optional(),
  website: z.string().optional(), // honeypot
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const log = logger.child({ path: "/api/storefront/[slug]/booking", slug });

  try {
    const body = await request.json();
    const parsed = bookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.issues },
        { status: 400 },
      );
    }
    const data = parsed.data;

    // Honeypot — silently accept bots
    if (data.website && data.website.length > 0) {
      return NextResponse.json({ success: true });
    }

    const config = await prisma.storefrontConfig.findUnique({
      where: { slug },
      select: { tenantId: true, enabled: true, allowBookings: true },
    });

    if (!config || !config.enabled) {
      return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
    }
    if (!config.allowBookings) {
      return NextResponse.json(
        { error: "Las reservas estan desactivadas en esta tienda" },
        { status: 403 },
      );
    }

    // Rate limit — max 3 per email per hour per tenant
    const oneHourAgo = new Date(Date.now() - 3_600_000);
    const recent = await prisma.bookingRequest.count({
      where: {
        tenantId: config.tenantId,
        customerEmail: data.customerEmail.toLowerCase(),
        createdAt: { gte: oneHourAgo },
      },
    });
    if (recent >= 3) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intentalo de nuevo en 1 hora." },
        { status: 429 },
      );
    }

    const startDate = new Date(data.startDate);
    const endDate = data.endDate ? new Date(data.endDate) : null;
    if (Number.isNaN(startDate.getTime())) {
      return NextResponse.json({ error: "Fecha de inicio invalida" }, { status: 400 });
    }
    if (endDate && Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Fecha de fin invalida" }, { status: 400 });
    }

    const booking = await prisma.bookingRequest.create({
      data: {
        tenantId: config.tenantId,
        customerName: data.customerName.trim(),
        customerEmail: data.customerEmail.trim().toLowerCase(),
        customerPhone: data.customerPhone?.trim() || null,
        productIds: JSON.parse(JSON.stringify(data.productIds)),
        destinationId: data.destinationId || null,
        startDate,
        endDate,
        guests: data.guests,
        notes: data.notes?.trim() || null,
        promoCode: data.promoCode?.trim() || null,
        status: "pending",
      },
    });

    log.info({ bookingId: booking.id }, "Booking request created");
    return NextResponse.json({ success: true, bookingId: booking.id }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Failed to create booking request");
    return NextResponse.json(
      { error: "Error al enviar la solicitud" },
      { status: 500 },
    );
  }
}
