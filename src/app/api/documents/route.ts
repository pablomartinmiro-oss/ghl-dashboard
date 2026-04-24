import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { DOCUMENT_TYPES } from "@/lib/templates/defaults";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type");
  const limit = Math.min(Number(searchParams.get("limit") ?? 50) || 50, 200);

  const where: Prisma.GeneratedDocumentWhereInput = { tenantId };
  if (type && (DOCUMENT_TYPES as readonly string[]).includes(type)) {
    where.type = type;
  }

  const documents = await prisma.generatedDocument.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      recipientEmail: true,
      sentAt: true,
      createdAt: true,
      templateId: true,
    },
  });
  return NextResponse.json({ documents });
}
