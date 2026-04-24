import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

interface ImportProduct {
  name: string;
  category: string;
  station: string;
  price: number;
  priceType: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/products/bulk-import" });

  try {
    const body = await req.json();
    const products = body.products as ImportProduct[];

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "No products provided" }, { status: 400 });
    }

    if (products.length > 500) {
      return NextResponse.json({ error: "Maximum 500 products per import" }, { status: 400 });
    }

    let imported = 0;
    let updated = 0;

    for (const p of products) {
      if (!p.name || typeof p.price !== "number") continue;

      // Match by (tenantId, name) so we never clobber another tenant's or the global catalog
      const existing = await prisma.product.findFirst({
        where: { name: p.name, tenantId },
      });

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            price: p.price,
            ...(p.category ? { category: p.category } : {}),
            ...(p.station ? { station: p.station } : {}),
            ...(p.priceType ? { priceType: p.priceType } : {}),
          },
        });
        updated++;
      } else {
        await prisma.product.create({
          data: {
            tenantId,
            name: p.name,
            category: p.category || "alquiler",
            station: p.station || "all",
            price: p.price,
            priceType: p.priceType || "fixed",
            isActive: true,
          },
        });
        imported++;
      }
    }

    log.info({ imported, updated }, "Bulk import completed");
    return NextResponse.json({ imported: imported + updated, created: imported, updated });
  } catch (error) {
    log.error({ error }, "Failed to bulk import products");
    return NextResponse.json({ error: "Failed to import products" }, { status: 500 });
  }
}
