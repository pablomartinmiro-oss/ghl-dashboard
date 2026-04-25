import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  customerName: z.string().min(1).max(120),
  customerEmail: z.string().email().max(200),
  reservationId: z.string().nullable().optional(),
});

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const requests = await prisma.reviewRequest.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ requests });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/reviews/requests" });

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

    const reviewRequest = await prisma.reviewRequest.create({
      data: {
        tenantId,
        customerName: d.customerName,
        customerEmail: d.customerEmail,
        reservationId: d.reservationId ?? null,
        sentAt: new Date(),
        status: "sent",
      },
    });

    log.info({ requestId: reviewRequest.id }, "Review request created");
    // Email delivery is best-effort and currently outside this route's scope —
    // the unique link is the token field; integrate with Resend in send pipeline.
    return NextResponse.json({ request: reviewRequest }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Failed to create review request");
    return NextResponse.json(
      { error: "Failed to create review request" },
      { status: 500 }
    );
  }
}
