import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const log = logger.child({ path: "/api/products" });
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category");
  const station = searchParams.get("station");

  try {
    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (station) where.station = station;

    const products = await prisma.product.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { name: "asc" }],
    });

    log.info({ count: products.length }, "Products fetched");
    return NextResponse.json({ products });
  } catch (error) {
    log.error({ error }, "Failed to fetch products");
    return NextResponse.json(
      { error: "Failed to fetch products", code: "PRODUCTS_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const log = logger.child({ path: "/api/products" });

  try {
    const body = await request.json();
    const product = await prisma.product.create({
      data: {
        category: body.category,
        name: body.name,
        station: body.station || "all",
        description: body.description || null,
        personType: body.personType || null,
        tier: body.tier || null,
        includesHelmet: body.includesHelmet ?? false,
        price: parseFloat(body.price) || 0,
        priceType: body.priceType,
        pricingMatrix: body.pricingMatrix ? JSON.parse(JSON.stringify(body.pricingMatrix)) : null,
        sortOrder: body.sortOrder ?? 0,
        isActive: body.isActive ?? true,
      },
    });

    log.info({ productId: product.id }, "Product created");
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Failed to create product");
    return NextResponse.json(
      { error: "Failed to create product", code: "PRODUCTS_ERROR" },
      { status: 500 }
    );
  }
}
