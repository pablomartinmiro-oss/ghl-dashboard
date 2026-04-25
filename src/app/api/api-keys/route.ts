import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashApiKey } from "@/lib/api-auth/verify";

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      permissions: true,
      active: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: keys });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = body.name ?? "API Key";
  const permissions = Array.isArray(body.permissions) ? body.permissions : [];

  // Generate key: sk_live_<32-byte hex>
  const rawSecret = randomBytes(32).toString("hex");
  const fullKey = `sk_live_${rawSecret}`;
  const prefix = fullKey.slice(0, 12);
  const keyHash = hashApiKey(fullKey);

  const apiKey = await prisma.apiKey.create({
    data: {
      tenantId: session.user.tenantId,
      name,
      prefix,
      keyHash,
      permissions,
      active: true,
      createdById: session.user.id,
    },
  });

  return NextResponse.json(
    {
      data: {
        id: apiKey.id,
        name: apiKey.name,
        prefix: apiKey.prefix,
        key: fullKey,
        permissions: apiKey.permissions,
        createdAt: apiKey.createdAt,
      },
    },
    { status: 201 }
  );
}
