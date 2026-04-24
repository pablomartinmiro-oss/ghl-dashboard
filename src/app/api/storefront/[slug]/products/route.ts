import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const log = logger.child({ path: "/api/storefront/[slug]/products", slug });

  const { searchParams } = request.nextUrl;
  const destinationId = searchParams.get("destinationId");
  const category = searchParams.get("category");
  const serviceCategoryId = searchParams.get("serviceCategoryId");

  try {
    const config = await prisma.storefrontConfig.findUnique({
      where: { slug },
      select: { tenantId: true, enabled: true, showPrices: true },
    });

    if (!config || !config.enabled) {
      return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
    }

    const where: Record<string, unknown> = {
      isActive: true,
      OR: [{ tenantId: null }, { tenantId: config.tenantId }],
    };
    if (destinationId) where.destinationId = destinationId;
    if (category) where.category = category;
    if (serviceCategoryId) where.serviceCategoryId = serviceCategoryId;

    const products = await prisma.product.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { name: "asc" }],
      include: {
        destination: { select: { id: true, name: true, slug: true } },
        serviceCategory: { select: { id: true, name: true, slug: true, icon: true } },
      },
    });

    const sanitized = products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      station: p.station,
      personType: p.personType,
      tier: p.tier,
      priceType: p.priceType,
      price: config.showPrices ? p.price : null,
      destination: p.destination,
      serviceCategory: p.serviceCategory,
    }));

    return NextResponse.json({ products: sanitized });
  } catch (error) {
    log.error({ error }, "Failed to fetch storefront products");
    return NextResponse.json({ error: "Error al cargar productos" }, { status: 500 });
  }
}
