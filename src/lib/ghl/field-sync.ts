import { getGHLClient } from "@/lib/ghl/api";
import { logger } from "@/lib/logger";

const log = logger.child({ layer: "ghl-field-sync" });

export interface SkiCustomFieldDef {
  fieldKey: string;
  name: string;
  dataType: "TEXT" | "LARGE_TEXT" | "NUMERICAL" | "DATE" | "DROPDOWN";
}

export const SKI_CUSTOM_FIELDS: SkiCustomFieldDef[] = [
  { fieldKey: "ski_sizing_height", name: "Altura (cm)", dataType: "NUMERICAL" },
  { fieldKey: "ski_sizing_weight", name: "Peso (kg)", dataType: "NUMERICAL" },
  { fieldKey: "ski_sizing_shoe", name: "Talla calzado (EU)", dataType: "TEXT" },
  { fieldKey: "ski_sizing_level", name: "Nivel esquí", dataType: "DROPDOWN" },
  { fieldKey: "last_destination", name: "Última estación", dataType: "TEXT" },
  { fieldKey: "total_bookings", name: "Reservas totales", dataType: "NUMERICAL" },
  { fieldKey: "total_spent_eur", name: "Gasto total (€)", dataType: "NUMERICAL" },
  { fieldKey: "last_booking_date", name: "Última reserva", dataType: "DATE" },
  { fieldKey: "equipment_preference", name: "Preferencia equipo", dataType: "TEXT" },
  { fieldKey: "loyalty_tier", name: "Nivel fidelidad", dataType: "DROPDOWN" },
];

export interface EnsureFieldsResult {
  created: string[];
  existing: string[];
  failed: Array<{ fieldKey: string; error: string }>;
}

export async function ensureCustomFields(tenantId: string): Promise<EnsureFieldsResult> {
  const ghl = await getGHLClient(tenantId);
  const existing = await ghl.getCustomFields();
  const existingKeys = new Set(existing.map((f) => f.fieldKey));

  const result: EnsureFieldsResult = { created: [], existing: [], failed: [] };

  for (const def of SKI_CUSTOM_FIELDS) {
    if (existingKeys.has(def.fieldKey) || existingKeys.has(`contact.${def.fieldKey}`)) {
      result.existing.push(def.fieldKey);
      continue;
    }
    try {
      await ghl.createCustomField({
        name: def.name,
        fieldKey: def.fieldKey,
        dataType: def.dataType,
      });
      result.created.push(def.fieldKey);
      log.info({ tenantId, fieldKey: def.fieldKey }, "Created GHL custom field");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.failed.push({ fieldKey: def.fieldKey, error: msg });
      log.warn({ tenantId, fieldKey: def.fieldKey, error: msg }, "Failed to create custom field");
    }
  }

  return result;
}

export interface SyncFieldsData {
  ski_sizing_height?: number | null;
  ski_sizing_weight?: number | null;
  ski_sizing_shoe?: string | null;
  ski_sizing_level?: string | null;
  last_destination?: string | null;
  total_bookings?: number | null;
  total_spent_eur?: number | null;
  last_booking_date?: string | null;
  equipment_preference?: string | null;
  loyalty_tier?: string | null;
  last_lesson_date?: string | null;
  student_level?: string | null;
  total_lessons?: number | null;
}

export async function syncContactFields(
  tenantId: string,
  contactId: string,
  data: SyncFieldsData,
): Promise<void> {
  try {
    const ghl = await getGHLClient(tenantId);
    const customField: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null || value === "") continue;
      customField[key] = String(value);
    }
    const count = Object.keys(customField).length;
    if (!count) return;
    await ghl.updateContact(contactId, { customField });
    log.info({ tenantId, contactId, count }, "Synced custom fields to GHL");
  } catch (err) {
    log.error({ tenantId, contactId, error: err }, "Failed to sync contact fields to GHL");
  }
}
