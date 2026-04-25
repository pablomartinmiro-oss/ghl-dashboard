import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

const STATUS = ["pending", "approved", "rejected", "featured"] as const;
const SOURCES = ["email", "storefront", "manual", "google"] as const;

const createSchema = z.object({
  customerName: z.string().min(1).max(120),
  customerEmail: z.string().email().max(200).nullable().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).nullable().optional(),
  content: z.string().max(5000).nullable().optional(),
  destinationId: z.string().nullable().optional(),
  productId: z.string().nullable().optional(),
  reservationId: z.string().nullable().optional(),
  status: z.enum(STATUS).optional(),
  source: z.enum(SOURCES).optional(),
  verifiedPurchase: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { searchParams } = request.nextUrl;

  const where: Prisma.ReviewWhereInput = { tenantId };
  const status = searchParams.get("status");
  const rating = searchParams.get("rating");
  const destinationId = searchParams.get("destinationId");
  if (status) where.status = status;
  if (rating) where.rating = Number(rating);
  if (destinationId) where.destinationId = destinationId;

  const reviews = await prisma.review.findMany({
    where,
    include: {
      destination: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return NextResponse.json({ reviews });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/reviews" });

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const d = parsed.data;

    if (d.destinationId) {
      const dest = await prisma.destination.findFirst({
        where: { id: d.destinationId, tenantId },
      });
      if (!dest) {
        return NextResponse.json(
          { error: "Destination not found" },
          { status: 400 }
        );
      }
    }

    const review = await prisma.review.create({
      data: {
        tenantId,
        customerName: d.customerName,
        customerEmail: d.customerEmail ?? null,
        rating: d.rating,
        title: d.title ?? null,
        content: d.content ?? null,
        destinationId: d.destinationId ?? null,
        productId: d.productId ?? null,
        reservationId: d.reservationId ?? null,
        status: d.status ?? "approved",
        source: d.source ?? "manual",
        verifiedPurchase: d.verifiedPurchase ?? false,
      },
      include: {
        destination: { select: { id: true, name: true } },
      },
    });

    log.info({ reviewId: review.id }, "Review created");
    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Failed to create review");
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}
