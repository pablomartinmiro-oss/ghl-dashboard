import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiKey } from "@/lib/api-auth/verify";

export async function GET(request: NextRequest) {
  const auth = await verifyApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");
  const destinationId = searchParams.get("destination");
  const categoryId = searchParams.get("category");

  const date = dateStr ? new Date(dateStr) : new Date();

  const inventory = await prisma.inventoryItem.findMany({
    where: {
      tenantId: auth.tenantId,
      ...(destinationId ? { destinationId } : {}),
      ...(categoryId ? { categoryId } : {}),
    },
    include: {
      category: { select: { slug: true, name: true } },
      destination: { select: { slug: true, name: true } },
    },
  });

  const data = inventory.map((item) => ({
    id: item.id,
    serialNumber: item.serialNumber,
    category: item.category.slug,
    destination: item.destination.slug,
    size: item.size,
    status: item.status,
    available: item.status === "available",
    date: date.toISOString(),
  }));

  return NextResponse.json({ data, count: data.length });
}
