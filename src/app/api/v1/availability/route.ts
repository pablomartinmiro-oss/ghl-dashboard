import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/api-auth/verify";

export async function GET(request: NextRequest) {
  const auth = await verifyApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");
  const destination = searchParams.get("destination");
  const category = searchParams.get("category");

  const date = dateStr ? new Date(dateStr) : new Date();

  const inventory = await prisma.inventoryItem.findMany({
    where: {
      tenantId: auth.tenantId,
      ...(destination ? { station: destination } : {}),
      ...(category ? { category } : {}),
    },
  });

  const data = inventory.map((item) => ({
    id: item.id,
    sku: item.sku,
    category: item.category,
    station: item.station,
    size: item.size,
    available: item.quantity - (item.reserved ?? 0),
    quantity: item.quantity,
    reserved: item.reserved ?? 0,
    date: date.toISOString(),
  }));

  return NextResponse.json({ data, count: data.length });
}
