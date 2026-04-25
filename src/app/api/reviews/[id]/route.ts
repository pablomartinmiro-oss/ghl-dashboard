import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

const STATUS = ["pending", "approved", "rejected", "featured"] as const;

const updateSchema = z.object({
  status: z.enum(STATUS).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(200).nullable().optional(),
  content: z.string().max(5000).nullable().optional(),
  response: z.string().max(5000).nullable().optional(),
  destinationId: z.string().nullable().optional(),
  verifiedPurchase: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { id } = await params;
  const log = logger.child({ tenantId, path: `/api/reviews/${id}` });

  try {
    const existing = await prisma.review.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const d = parsed.data;

    const data: Prisma.ReviewUpdateInput = {};
    if (d.status !== undefined) data.status = d.status;
    if (d.rating !== undefined) data.rating = d.rating;
    if (d.title !== undefined) data.title = d.title;
    if (d.content !== undefined) data.content = d.content;
    if (d.response !== undefined) {
      data.response = d.response;
      data.respondedAt = d.response ? new Date() : null;
    }
    if (d.destinationId !== undefined) {
      data.destination = d.destinationId
        ? { connect: { id: d.destinationId } }
        : { disconnect: true };
    }
    if (d.verifiedPurchase !== undefined) {
      data.verifiedPurchase = d.verifiedPurchase;
    }

    const review = await prisma.review.update({
      where: { id },
      data,
      include: { destination: { select: { id: true, name: true } } },
    });
    log.info({ reviewId: id }, "Review updated");
    return NextResponse.json({ review });
  } catch (error) {
    log.error({ error }, "Failed to update review");
    return NextResponse.json(
      { error: "Failed to update review" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { id } = await params;
  const log = logger.child({ tenantId, path: `/api/reviews/${id}` });

  const existing = await prisma.review.findFirst({ where: { id, tenantId } });
  if (!existing) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }
  await prisma.review.delete({ where: { id } });
  log.info({ reviewId: id }, "Review deleted");
  return NextResponse.json({ success: true });
}
