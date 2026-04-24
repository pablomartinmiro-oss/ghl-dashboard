import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { renderTemplate, type TenantBrandingLite } from "@/lib/templates/engine";
import { getSampleContext, type DocumentType } from "@/lib/templates/defaults";

const previewSchema = z.object({
  data: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const { id } = await params;
  const log = logger.child({ tenantId, path: `/api/templates/${id}/preview` });

  try {
    const template = await prisma.documentTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = previewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const branding = await prisma.tenantBranding.findUnique({ where: { tenantId } });
    const brandingLite: TenantBrandingLite | undefined = branding
      ? {
          businessName: branding.businessName,
          logoUrl: branding.logoUrl,
          primaryColor: branding.primaryColor,
          secondaryColor: branding.secondaryColor,
          supportEmail: branding.supportEmail,
          supportPhone: branding.supportPhone,
          website: branding.website,
          address: branding.address,
          cif: branding.cif,
        }
      : undefined;

    const sample = getSampleContext(template.type as DocumentType) ?? {};
    const context = { ...sample, ...(parsed.data.data ?? {}) } as Record<
      string,
      Parameters<typeof renderTemplate>[1][string]
    >;

    const html = renderTemplate(template.htmlBody, context, brandingLite);
    const subject = template.subject
      ? renderTemplate(template.subject, context, brandingLite)
      : null;

    return NextResponse.json({ html, subject });
  } catch (error) {
    log.error({ error }, "Failed to preview template");
    return NextResponse.json({ error: "Failed to preview template" }, { status: 500 });
  }
}
