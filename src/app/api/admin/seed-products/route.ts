import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { buildFullCatalog, SEASON_CALENDAR } from "@/lib/constants/product-catalog";

export async function POST() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = session.user;
  const log = logger.child({ route: "seed-products" });

  try {
    // 1. Delete all global products (tenantId = null) and this tenant's season calendar
    const [deletedProducts, deletedSeasons] = await Promise.all([
      prisma.product.deleteMany({ where: { tenantId: null } }),
      prisma.seasonCalendar.deleteMany({ where: { tenantId } }),
    ]);
    log.info({ deletedProducts: deletedProducts.count, deletedSeasons: deletedSeasons.count }, "Cleared old data");

    // 2. Build and insert all products
    const catalog = buildFullCatalog();
    let productCount = 0;

    for (const p of catalog) {
      await prisma.product.create({
        data: {
          category: p.category,
          name: p.name,
          station: p.station,
          description: p.description ?? null,
          personType: p.personType ?? null,
          tier: p.tier ?? null,
          includesHelmet: p.includesHelmet ?? false,
          priceType: p.priceType,
          price: p.price,
          pricingMatrix: JSON.parse(JSON.stringify(p.pricingMatrix)),
          sortOrder: p.sortOrder,
          isActive: true,
        },
      });
      productCount++;
    }

    // 3. Insert season calendar
    let seasonCount = 0;
    for (const entry of SEASON_CALENDAR) {
      await prisma.seasonCalendar.create({
        data: {
          tenantId,
          station: entry.station,
          season: entry.season,
          startDate: new Date(entry.startDate),
          endDate: new Date(entry.endDate),
          label: entry.label,
        },
      });
      seasonCount++;
    }

    log.info({ products: productCount, seasons: seasonCount }, "Seed complete");

    return NextResponse.json({
      message: `Catálogo completo importado: ${productCount} productos, ${seasonCount} periodos de temporada`,
      products: productCount,
      seasons: seasonCount,
    });
  } catch (error) {
    log.error({ error }, "Seed failed");
    return NextResponse.json(
      { error: "Seed failed", detail: error instanceof Error ? error.message : "" },
      { status: 500 },
    );
  }
}
