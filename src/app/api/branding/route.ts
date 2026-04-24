import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const upsertSchema = z.object({
  businessName: z.string().min(1).max(120),
  logoUrl: z.string().max(500).nullable().optional(),
  faviconUrl: z.string().max(500).nullable().optional(),
  primaryColor: z.string().regex(HEX_COLOR, "Color must be hex (e.g. #E87B5A)").optional(),
  secondaryColor: z.string().regex(HEX_COLOR).nullable().optional(),
  accentColor: z.string().regex(HEX_COLOR).nullable().optional(),
  tagline: z.string().max(200).nullable().optional(),
  supportEmail: z.string().email().nullable().optional().or(z.literal("")),
  supportPhone: z.string().max(40).nullable().optional(),
  website: z.string().max(200).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  cif: z.string().max(40).nullable().optional(),
  timezone: z.string().max(60).optional(),
  currency: z.string().max(10).optional(),
  locale: z.string().max(20).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/branding" });

  try {
    const branding = await prisma.tenantBranding.findUnique({ where: { tenantId } });
    return NextResponse.json({ branding });
  } catch (error) {
    log.error({ error }, "Failed to fetch branding");
    return NextResponse.json({ error: "Failed to fetch branding" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/branding" });

  try {
    const body = await request.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }
    const data = parsed.data;

    const normalize = <T extends string | null | undefined>(v: T) =>
      v === "" ? null : v ?? null;

    const branding = await prisma.tenantBranding.upsert({
      where: { tenantId },
      create: {
        tenantId,
        businessName: data.businessName,
        logoUrl: normalize(data.logoUrl),
        faviconUrl: normalize(data.faviconUrl),
        primaryColor: data.primaryColor ?? "#E87B5A",
        secondaryColor: normalize(data.secondaryColor),
        accentColor: normalize(data.accentColor),
        tagline: normalize(data.tagline),
        supportEmail: normalize(data.supportEmail),
        supportPhone: normalize(data.supportPhone),
        website: normalize(data.website),
        address: normalize(data.address),
        cif: normalize(data.cif),
        timezone: data.timezone ?? "Europe/Madrid",
        currency: data.currency ?? "EUR",
        locale: data.locale ?? "es-ES",
      },
      update: {
        businessName: data.businessName,
        ...(data.logoUrl !== undefined && { logoUrl: normalize(data.logoUrl) }),
        ...(data.faviconUrl !== undefined && { faviconUrl: normalize(data.faviconUrl) }),
        ...(data.primaryColor !== undefined && { primaryColor: data.primaryColor }),
        ...(data.secondaryColor !== undefined && { secondaryColor: normalize(data.secondaryColor) }),
        ...(data.accentColor !== undefined && { accentColor: normalize(data.accentColor) }),
        ...(data.tagline !== undefined && { tagline: normalize(data.tagline) }),
        ...(data.supportEmail !== undefined && { supportEmail: normalize(data.supportEmail) }),
        ...(data.supportPhone !== undefined && { supportPhone: normalize(data.supportPhone) }),
        ...(data.website !== undefined && { website: normalize(data.website) }),
        ...(data.address !== undefined && { address: normalize(data.address) }),
        ...(data.cif !== undefined && { cif: normalize(data.cif) }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.locale !== undefined && { locale: data.locale }),
      },
    });

    log.info({ brandingId: branding.id }, "Branding upserted");
    return NextResponse.json({ branding });
  } catch (error) {
    log.error({ error }, "Failed to upsert branding");
    return NextResponse.json({ error: "Failed to upsert branding" }, { status: 500 });
  }
}
