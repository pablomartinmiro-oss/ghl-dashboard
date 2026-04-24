import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const log = logger.child({ path: "/api/storefront/[slug]", slug });

  try {
    const config = await prisma.storefrontConfig.findUnique({
      where: { slug },
    });

    if (!config || !config.enabled) {
      return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
    }

    const branding = await prisma.tenantBranding.findUnique({
      where: { tenantId: config.tenantId },
    });

    return NextResponse.json({
      config: {
        slug: config.slug,
        heroTitle: config.heroTitle,
        heroSubtitle: config.heroSubtitle,
        heroImageUrl: config.heroImageUrl,
        aboutText: config.aboutText,
        contactEmail: config.contactEmail,
        contactPhone: config.contactPhone,
        socialLinks: config.socialLinks,
        seoTitle: config.seoTitle,
        seoDescription: config.seoDescription,
        customCss: config.customCss,
        showPrices: config.showPrices,
        allowBookings: config.allowBookings,
      },
      branding: branding
        ? {
            businessName: branding.businessName,
            logoUrl: branding.logoUrl,
            faviconUrl: branding.faviconUrl,
            primaryColor: branding.primaryColor,
            secondaryColor: branding.secondaryColor,
            accentColor: branding.accentColor,
            tagline: branding.tagline,
            supportEmail: branding.supportEmail,
            supportPhone: branding.supportPhone,
            website: branding.website,
          }
        : null,
    });
  } catch (error) {
    log.error({ error }, "Failed to fetch storefront");
    return NextResponse.json({ error: "Error al cargar la tienda" }, { status: 500 });
  }
}
