import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/;

const upsertSchema = z.object({
  enabled: z.boolean().optional(),
  slug: z.string().regex(SLUG_REGEX, "Slug: letras minusculas, numeros y guiones (2-60 caracteres)"),
  heroTitle: z.string().max(160).nullable().optional(),
  heroSubtitle: z.string().max(300).nullable().optional(),
  heroImageUrl: z.string().max(500).nullable().optional(),
  aboutText: z.string().max(5000).nullable().optional(),
  contactEmail: z.string().email().nullable().optional().or(z.literal("")),
  contactPhone: z.string().max(40).nullable().optional(),
  socialLinks: z.record(z.string(), z.string()).nullable().optional(),
  seoTitle: z.string().max(160).nullable().optional(),
  seoDescription: z.string().max(300).nullable().optional(),
  customCss: z.string().max(20000).nullable().optional(),
  showPrices: z.boolean().optional(),
  allowBookings: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/storefront/config" });

  try {
    const config = await prisma.storefrontConfig.findUnique({ where: { tenantId } });
    return NextResponse.json({ config });
  } catch (error) {
    log.error({ error }, "Failed to fetch storefront config");
    return NextResponse.json({ error: "Error al cargar la configuracion" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/storefront/config" });

  try {
    const body = await request.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.issues },
        { status: 400 },
      );
    }
    const data = parsed.data;
    const norm = <T extends string | null | undefined>(v: T) => (v === "" ? null : v ?? null);

    const socialLinks = data.socialLinks
      ? (JSON.parse(JSON.stringify(data.socialLinks)) as object)
      : null;

    const config = await prisma.storefrontConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        slug: data.slug,
        enabled: data.enabled ?? false,
        heroTitle: norm(data.heroTitle),
        heroSubtitle: norm(data.heroSubtitle),
        heroImageUrl: norm(data.heroImageUrl),
        aboutText: norm(data.aboutText),
        contactEmail: norm(data.contactEmail),
        contactPhone: norm(data.contactPhone),
        socialLinks: socialLinks ?? undefined,
        seoTitle: norm(data.seoTitle),
        seoDescription: norm(data.seoDescription),
        customCss: norm(data.customCss),
        showPrices: data.showPrices ?? true,
        allowBookings: data.allowBookings ?? true,
      },
      update: {
        slug: data.slug,
        ...(data.enabled !== undefined && { enabled: data.enabled }),
        ...(data.heroTitle !== undefined && { heroTitle: norm(data.heroTitle) }),
        ...(data.heroSubtitle !== undefined && { heroSubtitle: norm(data.heroSubtitle) }),
        ...(data.heroImageUrl !== undefined && { heroImageUrl: norm(data.heroImageUrl) }),
        ...(data.aboutText !== undefined && { aboutText: norm(data.aboutText) }),
        ...(data.contactEmail !== undefined && { contactEmail: norm(data.contactEmail) }),
        ...(data.contactPhone !== undefined && { contactPhone: norm(data.contactPhone) }),
        ...(data.socialLinks !== undefined && { socialLinks: socialLinks ?? undefined }),
        ...(data.seoTitle !== undefined && { seoTitle: norm(data.seoTitle) }),
        ...(data.seoDescription !== undefined && { seoDescription: norm(data.seoDescription) }),
        ...(data.customCss !== undefined && { customCss: norm(data.customCss) }),
        ...(data.showPrices !== undefined && { showPrices: data.showPrices }),
        ...(data.allowBookings !== undefined && { allowBookings: data.allowBookings }),
      },
    });

    log.info({ configId: config.id, slug: config.slug }, "Storefront config upserted");
    return NextResponse.json({ config });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "Ese slug ya esta en uso, elige otro" },
        { status: 409 },
      );
    }
    log.error({ error }, "Failed to upsert storefront config");
    return NextResponse.json({ error: "Error al guardar la configuracion" }, { status: 500 });
  }
}
