/**
 * Auto-create a draft Quote from GHL ContactCreate webhook survey data.
 * Handles: season detection, duplicate dedup, season-aware pricing,
 * GHL opportunity creation, and confirmation email to client.
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email/client";
import { createSurveyOpportunity } from "./opportunity";
import { getCustomFieldIdToKeyMap } from "@/lib/ghl/custom-fields";
import { normalizeDestination } from "@/lib/destinations";

interface QuoteItemInput {
  productId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

const log = logger.child({ module: "from-survey" });

// Hardcoded fallback — GHL API /locations/customFields returns 403 (scope not granted).
// IDs extracted from real webhook payloads observed in production logs (2026-03-19).
const HARDCODED_FIELD_IDS: Record<string, string> = {
  K7RFol5m4m2eOH1WcoYx: "destino",
  lMUYIYlz7CfWKBpIOAPw: "fecha_de_entrada",
  LDVitENBIT4X4unOJSoq: "fecha_de_salida",
  P0MxXLSR0ZPTO4jRZIF6: "nde_adultos_12_aos_o_mayor",
  SXXw7M407yfWXiHOrFYV: "n_de_nios_11_aos_o_menor",
  B2Vk41Jt2jeDmPNoJ4IY: "servicios_necesarios_survey",
  "4lyeEQvvPxeNhYW1z9h7": "nombre_del_alojamiento",
};

// ==================== SURVEY FIELD KEYS ====================

const SURVEY_KEYS = {
  destino: "destino",
  checkIn: "fecha_de_entrada",
  checkOut: "fecha_de_salida",
  adults: "nde_adultos_12_aos_o_mayor",
  children: "n_de_nios_11_aos_o_menor",
  services: "servicios_necesarios_survey",
  accommodationType: "tipo_de_alojamiento",
  accommodationName: "nombre_del_alojamiento",
} as const;

// Destination normalisation is handled by the shared normalizeDestination() from lib/destinations.ts

// ==================== CUSTOM FIELD EXTRACTION ====================

// GHL webhooks send: { id, value } (no key). value can be string or string[].
type RawCf = { id?: string; key?: string; field_value?: string; value?: string | string[] };
type RawCustomFields = Array<RawCf> | Record<string, string> | null | undefined;

/**
 * Extract custom fields into a flat Record<key, value>.
 * idKeyMap resolves GHL webhook IDs to fieldKey names when `key` is absent.
 */
function extractFields(cf: RawCustomFields, idKeyMap: Record<string, string> = {}): Record<string, string> {
  if (!cf) return {};
  if (Array.isArray(cf)) {
    const out: Record<string, string> = {};
    for (const f of cf) {
      const key = f.key ?? (f.id ? idKeyMap[f.id] : undefined);
      if (!key) continue;
      const raw = f.field_value ?? f.value;
      out[key] = Array.isArray(raw) ? raw.join(",") : String(raw ?? "");
    }
    return out;
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(cf)) out[k] = String(v ?? "");
  return out;
}

// ==================== SEASON DETECTION ====================

type Season = "alta" | "media" | "baja";

function detectSeason(checkIn: string): Season {
  const d = new Date(checkIn);
  const m = d.getMonth() + 1; // 1-12
  const day = d.getDate();

  // Alta: Dec 20 – Jan 6 | Feb 15 – Feb 28
  if ((m === 12 && day >= 20) || (m === 1 && day <= 6) || (m === 2 && day >= 15)) return "alta";
  // Media: Jan 7 – Feb 14 | Mar 1 – Mar 31
  if ((m === 1 && day >= 7) || (m === 2 && day <= 14) || m === 3) return "media";
  return "baja";
}

// ==================== SERVICES PARSING ====================

interface ParsedServices {
  wantsForfait: boolean;
  wantsEquipment: boolean;
  wantsClases: boolean;
  wantsAccommodation: boolean;
}

function parseServices(raw: string): ParsedServices {
  const parts = raw.split(",").map((s) => s.trim().toLowerCase());
  return {
    wantsForfait: parts.some((s) => s.includes("forfait")),
    wantsEquipment: parts.some((s) => s.includes("alquiler")),
    wantsClases: parts.some((s) => s.includes("escuela") || s.includes("clase") || s.includes("esqu")),
    wantsAccommodation: parts.some((s) => s.includes("alojamiento")),
  };
}

// ==================== PRODUCT MATCHING ====================

interface DbProduct {
  id: string;
  category: string;
  name: string;
  station: string;
  personType: string | null;
  tier: string | null;
  includesHelmet: boolean;
  price: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pricingMatrix: any;
  isActive: boolean;
}

function getDays(ci: string, co: string): number {
  return Math.max(1, Math.ceil((new Date(co).getTime() - new Date(ci).getTime()) / 86400000));
}

function getMatrixPrice(p: DbProduct, days: number, season: Season): number {
  if (p.pricingMatrix) {
    const m = p.pricingMatrix as Record<string, Record<string, number>>;
    const sp = m[season] ?? m["media"] ?? m["media_quality"];
    if (sp) {
      const ds = String(days);
      if (sp[ds] !== undefined) return sp[ds];
      const keys = Object.keys(sp).map(Number).sort((a, b) => a - b);
      if (days > keys[keys.length - 1]) return sp[String(keys[keys.length - 1])];
      return (sp["1"] ?? p.price) * days;
    }
  }
  return p.price * days;
}

function byStation(products: DbProduct[], station: string, cat: string): DbProduct[] {
  return products.filter((p) => p.category === cat && p.isActive && (p.station === station || p.station === "all"));
}

// ==================== DUPLICATE DETECTION ====================

async function findDuplicate(
  tenantId: string,
  email: string | null,
  ghlContactId: string | null,
  destination: string,
  checkIn: Date,
  checkOut: Date
): Promise<string | null> {
  if (!email && !ghlContactId) return null;
  const or: Record<string, unknown>[] = [];
  if (email) or.push({ clientEmail: email });
  if (ghlContactId) or.push({ ghlContactId });
  const ex = await prisma.quote.findFirst({
    where: { tenantId, status: "borrador", destination, checkIn: { lte: checkOut }, checkOut: { gte: checkIn }, OR: or },
    select: { id: true },
  });
  return ex?.id ?? null;
}

// ==================== CONFIRMATION EMAIL ====================

function confirmationEmailHtml(name: string, destination: string, ci: string, co: string): string {
  const dest = destination.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const fmt = (s: string) =>
    new Date(s).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  return `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px">
    <h2 style="color:#E87B5A">Hemos recibido tu solicitud</h2>
    <p>Hola <strong>${name}</strong>,</p>
    <p>Hemos recibido tu solicitud de presupuesto para <strong>${dest}</strong>
       del <strong>${fmt(ci)}</strong> al <strong>${fmt(co)}</strong>.</p>
    <p>En breve recibirás tu presupuesto personalizado.</p>
    <p>Un saludo,<br/>El equipo Skicenter</p>
  </div>`;
}

// ==================== MAIN EXPORT ====================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function maybeCreateQuoteFromSurvey(tenantId: string, contactData: Record<string, any>): Promise<void> {
  console.log("[SURVEY] Custom fields received:", JSON.stringify(contactData.customFields));

  // GHL webhooks send custom fields by ID — resolve to key names.
  // Hardcoded IDs are used as fallback since /locations/customFields returns 403 (scope not granted).
  const apiMap = await getCustomFieldIdToKeyMap(tenantId).catch(() => ({} as Record<string, string>));
  const idKeyMap = { ...HARDCODED_FIELD_IDS, ...apiMap };
  console.log("[SURVEY] ID→key map:", JSON.stringify(idKeyMap));

  const fields = extractFields(contactData.customFields as RawCustomFields, idKeyMap);
  console.log("[SURVEY] Resolved fields:", JSON.stringify(fields));

  const rawDestino = fields[SURVEY_KEYS.destino];
  const rawCheckIn = fields[SURVEY_KEYS.checkIn];
  const hasSurveyData = !!(rawDestino && rawCheckIn);
  console.log("[SURVEY] Destino value:", rawDestino);
  console.log("[SURVEY] CheckIn value:", rawCheckIn);
  console.log("[SURVEY] Survey detected:", hasSurveyData);

  // Only proceed if core survey fields are present
  if (!hasSurveyData) return;

  const rawCheckOut = fields[SURVEY_KEYS.checkOut] || rawCheckIn;
  const adults = Math.max(1, parseInt(fields[SURVEY_KEYS.adults] ?? "1", 10) || 1);
  const children = parseInt(fields[SURVEY_KEYS.children] ?? "0", 10) || 0;
  const rawServices = fields[SURVEY_KEYS.services] ?? "";
  const accommodationType = fields[SURVEY_KEYS.accommodationType] || null;
  const accommodationName = fields[SURVEY_KEYS.accommodationName] || null;

  const { slug: destination, stations } = normalizeDestination(rawDestino);
  const services = parseServices(rawServices);
  const season = detectSeason(rawCheckIn);

  const contactId = (contactData.id ?? contactData.contactId) as string | undefined;
  const contactFullName = `${(contactData.firstName as string) ?? ""} ${(contactData.lastName as string) ?? ""}`.trim();
  const clientName = (contactData.name as string) || contactFullName || "Sin nombre";
  const clientEmail = (contactData.email as string) ?? null;
  const clientPhone = (contactData.phone as string) ?? null;

  const accommodationNote = [
    accommodationType ? `Alojamiento: ${accommodationType}` : null,
    accommodationName ? `Nombre: ${accommodationName}` : null,
  ].filter(Boolean).join(" · ");

  log.info(
    { tenantId, contactId, destination, checkIn: rawCheckIn, adults, children, season },
    "Survey data detected — processing"
  );

  const checkInDate = new Date(rawCheckIn);
  const checkOutDate = new Date(rawCheckOut);

  // Duplicate detection — update existing draft instead of creating new one
  const duplicateId = await findDuplicate(tenantId, clientEmail, contactId ?? null, destination, checkInDate, checkOutDate);
  if (duplicateId) {
    log.info({ tenantId, duplicateId }, "[WEBHOOK] Duplicate detected — updating existing quote");
    await prisma.quote.update({
      where: { id: duplicateId },
      data: { adults, children, wantsAccommodation: services.wantsAccommodation, wantsForfait: services.wantsForfait, wantsClases: services.wantsClases, wantsEquipment: services.wantsEquipment },
    });
    return;
  }

  // Fetch global products across all station slugs in this destination cluster
  const products = await prisma.product.findMany({
    where: { tenantId: null, isActive: true, station: { in: [...stations, "all"] } },
  });

  const days = getDays(rawCheckIn, rawCheckOut);
  const items: QuoteItemInput[] = [];

  // Forfaits
  if (services.wantsForfait) {
    const forf = byStation(products, destination, "forfait");
    const af = forf.find((p) => p.personType === "adulto");
    if (af) {
      const pr = getMatrixPrice(af, days, season);
      items.push({ productId: af.id, name: af.name, quantity: adults, unitPrice: pr, discount: 0, totalPrice: pr * adults });
    }
    if (children > 0) {
      const cf = forf.find((p) => p.personType === "infantil");
      if (cf) {
        const pr = getMatrixPrice(cf, days, season);
        items.push({ productId: cf.id, name: cf.name, quantity: children, unitPrice: pr, discount: 0, totalPrice: pr * children });
      }
    }
  }

  // Equipment rental
  if (services.wantsEquipment) {
    const alq = byStation(products, destination, "alquiler");
    const ap =
      alq.find((p) => p.personType === "adulto" && (p.tier === "media" || p.tier === "media_quality") && p.includesHelmet) ??
      alq.find((p) => p.personType === "adulto" && (p.tier === "media" || p.tier === "media_quality")) ??
      alq.find((p) => p.personType === "adulto");
    if (ap) {
      const pr = getMatrixPrice(ap, days, season);
      items.push({ productId: ap.id, name: ap.name, quantity: adults, unitPrice: pr, discount: 0, totalPrice: pr * adults });
    }
    if (children > 0) {
      const cp =
        alq.find((p) => p.personType === "infantil" && (p.tier === "media" || p.tier === "media_quality")) ??
        alq.find((p) => p.personType === "infantil");
      if (cp) {
        const pr = getMatrixPrice(cp, days, season);
        items.push({ productId: cp.id, name: cp.name, quantity: children, unitPrice: pr, discount: 0, totalPrice: pr * children });
      }
    }
  }

  // Ski school
  if (services.wantsClases) {
    const esc = byStation(products, destination, "escuela");
    const cur = esc.find((p) => p.name.toLowerCase().includes("colectivo")) ?? esc[0];
    if (cur) {
      const tp = adults + children;
      const pr = getMatrixPrice(cur, days, season);
      items.push({ productId: cur.id, name: cur.name, quantity: tp, unitPrice: pr, discount: 0, totalPrice: pr * tp });
    }
  }

  const totalAmount = items.reduce((s, i) => s + i.totalPrice, 0);

  // GHL opportunity (non-blocking, skipped if GHL not connected)
  const opp = contactId
    ? await createSurveyOpportunity(tenantId, contactId, destination, clientName, totalAmount).catch(() => null)
    : null;

  const quote = await prisma.quote.create({
    data: {
      tenantId,
      ghlContactId: contactId ?? null,
      ghlOpportunityId: opp?.opportunityId ?? null,
      ghlPipelineId: opp?.pipelineId ?? null,
      ghlStageId: opp?.stageId ?? null,
      clientName: clientName as string,
      clientEmail,
      clientPhone,
      clientNotes: [
        accommodationNote || null,
        services.wantsAccommodation ? "Solicita alojamiento (pendiente de cotizar)" : null,
      ].filter(Boolean).join(" · ") || null,
      destination,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      adults,
      children,
      wantsAccommodation: services.wantsAccommodation,
      wantsForfait: services.wantsForfait,
      wantsClases: services.wantsClases,
      wantsEquipment: services.wantsEquipment,
      status: "borrador",
      source: "survey",
      totalAmount,
    },
  });

  if (items.length > 0) {
    await prisma.quoteItem.createMany({ data: items.map((item) => ({ ...item, quoteId: quote.id })) });
  }

  log.info(
    { tenantId, quoteId: quote.id, destination, itemCount: items.length, totalAmount, season },
    "Draft quote created from survey"
  );

  // Confirmation email to client (non-blocking)
  if (clientEmail) {
    sendEmail({
      tenantId,
      contactId: contactId ?? null,
      to: clientEmail,
      subject: "Hemos recibido tu solicitud de presupuesto",
      html: confirmationEmailHtml(clientName, destination, rawCheckIn, rawCheckOut),
    }).catch((err) => log.warn({ error: err }, "Failed to send confirmation email"));
  }
}
