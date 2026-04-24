import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const log = logger.child({ path: "/api/storefront/[slug]/destinations", slug });

  try {
    const config = await prisma.storefrontConfig.findUnique({
      where: { slug },
      select: { tenantId: true, enabled: true },
    });

    if (!config || !config.enabled) {
      return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
    }

    const destinations = await prisma.destination.findMany({
      where: { tenantId: config.tenantId, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        region: true,
        country: true,
        latitude: true,
        longitude: true,
        metadata: true,
      },
    });

    return NextResponse.json({ destinations });
  } catch (error) {
    log.error({ error }, "Failed to fetch storefront destinations");
    return NextResponse.json({ error: "Error al cargar destinos" }, { status: 500 });
  }
}
