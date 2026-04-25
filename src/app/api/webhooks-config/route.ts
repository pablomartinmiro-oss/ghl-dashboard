import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webhooks = await prisma.webhookEndpoint.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: webhooks });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  const secret = randomBytes(32).toString("hex");

  const webhook = await prisma.webhookEndpoint.create({
    data: {
      tenantId: session.user.tenantId,
      url: body.url,
      events: Array.isArray(body.events) ? body.events : [],
      secret,
      active: body.active !== false,
    },
  });

  return NextResponse.json({ data: webhook }, { status: 201 });
}
