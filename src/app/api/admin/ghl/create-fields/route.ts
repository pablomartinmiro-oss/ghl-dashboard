import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getGHLClient } from "@/lib/ghl/api";
import { logger } from "@/lib/logger";

const SKICENTER_FIELDS = [
  { name: "Estación preferida", fieldKey: "estacion_preferida", dataType: "TEXT" },
  { name: "Nivel de esquí", fieldKey: "nivel_esqui", dataType: "TEXT" },
  { name: "Código cupón Groupon", fieldKey: "codigo_groupon", dataType: "TEXT" },
  { name: "Número de reservas", fieldKey: "num_reservas", dataType: "NUMERICAL" },
  { name: "Última reserva", fieldKey: "ultima_reserva", dataType: "DATE" },
];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = session.user;
  const log = logger.child({ tenantId, path: "/api/admin/ghl/create-fields" });

  try {
    const body = await request.json().catch(() => ({}));
    const fieldsToCreate = (body as { fields?: typeof SKICENTER_FIELDS }).fields ?? SKICENTER_FIELDS;

    const ghl = await getGHLClient(tenantId);
    const existing = await ghl.getCustomFields();
    const existingNames = new Set(existing.map((f) => f.name));

    const created: string[] = [];
    const skipped: string[] = [];

    for (const field of fieldsToCreate) {
      if (existingNames.has(field.name)) {
        skipped.push(field.name);
        continue;
      }
      await ghl.createCustomField(field);
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
