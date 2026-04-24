import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { renderTemplate, type TenantBrandingLite } from "@/lib/templates/engine";
import {
  DOCUMENT_TYPES,
  getDefaultTemplate,
  type DocumentType,
} from "@/lib/templates/defaults";
import type { Prisma } from "@/generated/prisma/client";

const generateSchema = z.object({
  templateId: z.string().min(1).optional(),
  type: z.enum(DOCUMENT_TYPES).optional(),
  title: z.string().min(1).max(300),
  data: z.record(z.string(), z.unknown()).optional(),
  recipientEmail: z.string().email().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/documents/generate" });

  try {
    const body = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const d = parsed.data;
    if (!d.templateId && !d.type) {
      return NextResponse.json(
        { error: "Either templateId or type is required" },
        { status: 400 }
      );
    }

    let templateId: string | null = null;
    let templateHtml: string;
    let templateType: DocumentType;
    let templateSubject: string | null = null;

    if (d.templateId) {
      const template = await prisma.documentTemplate.findFirst({
        where: { id: d.templateId, tenantId },
      });
      if (!template) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }
      templateId = template.id;
      templateHtml = template.htmlBody;
      templateType = template.type as DocumentType;
      templateSubject = template.subject;
    } else {
      templateType = d.type as DocumentType;
      const tenantTemplate = await prisma.documentTemplate.findFirst({
        where: { tenantId, type: templateType, active: true },
        orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      });
      if (tenantTemplate) {
        templateId = tenantTemplate.id;
        templateHtml = tenantTemplate.htmlBody;
        templateSubject = tenantTemplate.subject;
      } else {
        const fallback = getDefaultTemplate(templateType);
        templateHtml = fallback.htmlBody;
        templateSubject = fallback.subject ?? null;
      }
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

    const context = (d.data ?? {}) as Record<
      string,
      Parameters<typeof renderTemplate>[1][string]
    >;

    const html = renderTemplate(templateHtml, context, brandingLite);
    const subject = templateSubject
      ? renderTemplate(templateSubject, context, brandingLite)
      : null;

    const document = await prisma.generatedDocument.create({
      data: {
        tenantId,
        templateId,
        type: templateType,
        title: d.title,
        htmlContent: html,
        recipientEmail: d.recipientEmail ?? null,
        metadata: (d.metadata ?? null) as Prisma.InputJsonValue,
      },
    });

    log.info({ documentId: document.id, type: templateType }, "Document generated");
    return NextResponse.json({ document, subject }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Failed to generate document");
    return NextResponse.json(
      { error: "Failed to generate document" },
      { status: 500 }
    );
  }
}
