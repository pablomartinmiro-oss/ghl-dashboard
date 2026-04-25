import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const submitSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).nullable().optional(),
  content: z.string().max(5000).nullable().optional(),
  customerName: z.string().min(1).max(120).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const reviewRequest = await prisma.reviewRequest.findUnique({
    where: { token },
  });
  if (!reviewRequest) {
    return NextResponse.json({ error: "Enlace no válido" }, { status: 404 });
  }
  if (reviewRequest.status === "completed") {
    return NextResponse.json({ error: "Ya has enviado tu reseña" }, { status: 410 });
  }

  const branding = await prisma.tenantBranding.findUnique({
    where: { tenantId: reviewRequest.tenantId },
    select: { businessName: true, primaryColor: true, logoUrl: true },
  });

  return NextResponse.json({
    customerName: reviewRequest.customerName,
    customerEmail: reviewRequest.customerEmail,
    completed: reviewRequest.status === "completed",
    branding: branding ?? null,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const log = logger.child({ token, path: `/api/reviews/public/${token}` });

  try {
    const reviewRequest = await prisma.reviewRequest.findUnique({
      where: { token },
    });
    if (!reviewRequest) {
      return NextResponse.json({ error: "Enlace no válido" }, { status: 404 });
    }
    if (reviewRequest.status === "completed") {
      return NextResponse.json(
        { error: "Ya has enviado tu reseña" },
        { status: 410 }
      );
    }

    const body = await request.json();
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const d = parsed.data;

    const review = await prisma.review.create({
      data: {
        tenantId: reviewRequest.tenantId,
        customerName: d.customerName ?? reviewRequest.customerName,
        customerEmail: reviewRequest.customerEmail,
        rating: d.rating,
        title: d.title ?? null,
        content: d.content ?? null,
        reservationId: reviewRequest.reservationId,
        status: "pending",
        source: "email",
        verifiedPurchase: Boolean(reviewRequest.reservationId),
      },
    });

    await prisma.reviewRequest.update({
      where: { id: reviewRequest.id },
      data: { status: "completed", completedAt: new Date() },
    });

    log.info({ reviewId: review.id }, "Public review submitted");
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Failed to submit public review");
    return NextResponse.json(
      { error: "Error al enviar la reseña" },
      { status: 500 }
    );
  }
}
