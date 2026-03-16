import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { hasPermission } from "@/lib/auth/permissions";
import type { PermissionKey } from "@/types/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions as PermissionKey[], "reservations:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = session.user;
  const { id } = await params;

  try {
    const quote = await prisma.quote.findFirst({
      where: { id, tenantId },
      include: { items: { include: { product: true } } },
    });
    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    return NextResponse.json({ quote });
  } catch (error) {
    logger.error({ error }, "Failed to fetch quote");
    return NextResponse.json(
      { error: "Failed to fetch quote", code: "QUOTES_ERROR" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions as PermissionKey[], "reservations:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = session.user;
  const { id } = await params;
  const log = logger.child({ tenantId, path: `/api/quotes/${id}` });

  try {
    const existing = await prisma.quote.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const body = await request.json();
    const quote = await prisma.quote.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.totalAmount !== undefined && { totalAmount: parseFloat(body.totalAmount) }),
        ...(body.expiresAt !== undefined && { expiresAt: new Date(body.expiresAt) }),
        ...(body.sentAt !== undefined && { sentAt: new Date(body.sentAt) }),
        ...(body.clientNotes !== undefined && { clientNotes: body.clientNotes }),
      },
      include: { items: true },
    });

    log.info({ quoteId: id, status: quote.status }, "Quote updated");
    return NextResponse.json({ quote });
  } catch (error) {
    log.error({ error }, "Failed to update quote");
    return NextResponse.json(
      { error: "Failed to update quote", code: "QUOTES_ERROR" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions as PermissionKey[], "reservations:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = session.user;
  const { id } = await params;
  const log = logger.child({ tenantId, path: `/api/quotes/${id}` });

  try {
    const existing = await prisma.quote.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    await prisma.quoteItem.deleteMany({ where: { quoteId: id } });
    await prisma.quote.delete({ where: { id } });

    log.info({ quoteId: id }, "Quote deleted");
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ error }, "Failed to delete quote");
    return NextResponse.json(
      { error: "Failed to delete quote", code: "QUOTES_ERROR" },
      { status: 500 }
    );
  }
}
