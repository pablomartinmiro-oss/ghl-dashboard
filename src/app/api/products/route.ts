import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/products" });
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category");
  const station = searchParams.get("station");
  const destinationId = searchParams.get("destinationId");

  try {
    const where: Record<string, unknown> = {
      // Show global catalog (tenantId: null) plus this tenant's overrides
      OR: [{ tenantId: null }, { tenantId }],
    };
    if (category) where.category = category;
    if (station) where.station = station;
    if (destinationId) where.destinationId = destinationId;

    const products = await prisma.product.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { name: "asc" }],
      include: {
        destination: { select: { id: true, name: true, slug: true, region: true } },
        supplier: { select: { id: true, name: true, slug: true } },
        serviceCategory: { select: { id: true, name: true, slug: true, icon: true } },
      },
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
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/products" });

  try {
    const body = await request.json();
    const product = await prisma.product.create({
      data: {
        tenantId,
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
        destinationId: body.destinationId || null,
        supplierId: body.supplierId || null,
        serviceCategoryId: body.serviceCategoryId || null,
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
