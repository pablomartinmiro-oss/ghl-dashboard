import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/api-auth/verify";

export async function GET(request: NextRequest) {
  const auth = await verifyApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const destination = searchParams.get("destination");

  const products = await prisma.product.findMany({
    where: {
      tenantId: auth.tenantId,
      ...(category ? { category } : {}),
      ...(destination ? { station: destination } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: products, count: products.length });
}
