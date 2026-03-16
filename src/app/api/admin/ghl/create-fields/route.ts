import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { hasPermission } from "@/lib/auth/permissions";
import { createCustomField, getCustomFields } from "@/lib/ghl/api";
import { logger } from "@/lib/logger";
import type { PermissionKey } from "@/types/auth";

const SKICENTER_FIELDS = [
  { name: "Estación preferida", dataType: "TEXT", placeholder: "Baqueira, Sierra Nevada..." },
  { name: "Nivel de esquí", dataType: "TEXT", placeholder: "Principiante, Intermedio, Avanzado" },
  { name: "Código cupón Groupon", dataType: "TEXT", placeholder: "GRP-XXXX" },
  { name: "Número de reservas", dataType: "NUMERICAL", placeholder: "0" },
  { name: "Última reserva", dataType: "DATE", placeholder: "" },
];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.permissions as PermissionKey[], "settings:tenant")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/admin/ghl/create-fields" });

  try {
    const body = await request.json().catch(() => ({}));
    const fieldsToCreate = (body as { fields?: typeof SKICENTER_FIELDS }).fields ?? SKICENTER_FIELDS;

    // Get existing fields to avoid duplicates
    const existing = await getCustomFields(tenantId);
    const existingNames = new Set(
      (existing.customFields as { name: string }[]).map((f) => f.name)
    );

    const created: string[] = [];
    const skipped: string[] = [];

    for (const field of fieldsToCreate) {
      if (existingNames.has(field.name)) {
        skipped.push(field.name);
        continue;
      }
      await createCustomField(tenantId, field);
      created.push(field.name);
    }

    log.info({ created: created.length, skipped: skipped.length }, "Custom fields sync complete");
    return NextResponse.json({ ok: true, created, skipped });
  } catch (error) {
    log.error({ error }, "Custom fields creation failed");
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
