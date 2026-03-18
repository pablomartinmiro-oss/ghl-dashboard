/**
 * Auto-create a draft Quote from GHL ContactCreate webhook survey data.
 *
 * GHL custom fields arrive as either:
 *   Array: [{ id, key, field_value }]
 *   Object: { destino: "Baqueira Beret", ... }
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

interface QuoteItemInput {
  productId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

const log = logger.child({ module: "from-survey" });

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

// ==================== DESTINATION NORMALISATION ====================

const DESTINATION_MAP: Record<string, string> = {
  "baqueira beret": "baqueira",
  baqueira: "baqueira",
  "sierra nevada": "sierra_nevada",
  sierra_nevada: "sierra_nevada",
  "la pinilla": "la_pinilla",
  la_pinilla: "la_pinilla",
  formigal: "formigal",
  "alto campoo": "alto_campoo",
  alto_campoo: "alto_campoo",
  grandvalira: "grandvalira",
};

function normaliseDestination(raw: string): string {
  return DESTINATION_MAP[raw.toLowerCase().trim()] ?? raw.toLowerCase().trim();
}

// ==================== CUSTOM FIELD EXTRACTION ====================

type RawCustomFields =
  | Array<{ id?: string; key?: string; field_value?: string; value?: string }>
  | Record<string, string>
  | null
  | undefined;

function extractFields(customFields: RawCustomFields): Record<string, string> {
  if (!customFields) return {};

  if (Array.isArray(customFields)) {
    const out: Record<string, string> = {};
    for (const f of customFields) {
      if (f.key) out[f.key] = String(f.field_value ?? f.value ?? "");
    }
    return out;
  }

  // Already a flat object
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(customFields)) {
    out[k] = String(v ?? "");
  }
  return out;
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

function getDays(checkIn: string, checkOut: string): number {
  return Math.max(
    1,
    Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
    )
  );
}

function getMatrixPrice(product: DbProduct, days: number): number {
  if (product.pricingMatrix) {
    const m = product.pricingMatrix as Record<string, Record<string, number>>;
    const seasonPrices = m["media"] ?? m["media_quality"];
    if (seasonPrices) {
      const dayStr = String(days);
      if (seasonPrices[dayStr] !== undefined) return seasonPrices[dayStr];
      const keys = Object.keys(seasonPrices).map(Number).sort((a, b) => a - b);
      if (days > keys[keys.length - 1])
        return seasonPrices[String(keys[keys.length - 1])];
      return (seasonPrices["1"] ?? product.price) * days;
    }
  }
  return product.price * days;
}

function byStation(products: DbProduct[], station: string, category: string): DbProduct[] {
  return products.filter(
    (p) =>
      p.category === category &&
      p.isActive &&
      (p.station === station || p.station === "all")
  );
}

// ==================== MAIN EXPORT ====================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function maybeCreateQuoteFromSurvey(tenantId: string, contactData: Record<string, any>): Promise<void> {
  const rawCustomFields = contactData.customFields as RawCustomFields;
  const fields = extractFields(rawCustomFields);

  const rawDestino = fields[SURVEY_KEYS.destino];
  const rawCheckIn = fields[SURVEY_KEYS.checkIn];

  // Only proceed if the core survey fields are present
  if (!rawDestino || !rawCheckIn) return;

  const rawCheckOut = fields[SURVEY_KEYS.checkOut] || rawCheckIn;
  const adults = Math.max(1, parseInt(fields[SURVEY_KEYS.adults] ?? "1", 10) || 1);
  const children = parseInt(fields[SURVEY_KEYS.children] ?? "0", 10) || 0;
  const rawServices = fields[SURVEY_KEYS.services] ?? "";
  const accommodationType = fields[SURVEY_KEYS.accommodationType] || null;
  const accommodationName = fields[SURVEY_KEYS.accommodationName] || null;

  const destination = normaliseDestination(rawDestino);
  const services = parseServices(rawServices);

  // Contact info from webhook payload
  const contactId = (contactData.id ?? contactData.contactId) as string | undefined;
  const contactFullName = `${(contactData.firstName as string) ?? ""} ${(contactData.lastName as string) ?? ""}`.trim();
  const clientName = (contactData.name as string) || contactFullName || "Sin nombre";
  const clientEmail = (contactData.email as string) ?? null;
  const clientPhone = (contactData.phone as string) ?? null;

  const accommodationNote = [
    accommodationType ? `Alojamiento: ${accommodationType}` : null,
    accommodationName ? `Nombre: ${accommodationName}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  log.info(
    { tenantId, contactId, destination, checkIn: rawCheckIn, adults, children },
    "Survey data detected — creating draft quote"
  );

  // Fetch global products for this destination
  const products = await prisma.product.findMany({
    where: {
      tenantId: null, // global catalog
      isActive: true,
      station: { in: [destination, "all"] },
    },
  });

  const days = getDays(rawCheckIn, rawCheckOut);
  const items: QuoteItemInput[] = [];

  // Forfaits
  if (services.wantsForfait) {
    const forfaits = byStation(products, destination, "forfait");
    const adultF = forfaits.find((p) => p.personType === "adulto");
    if (adultF) {
      const price = getMatrixPrice(adultF, days);
      items.push({
        productId: adultF.id,
        name: adultF.name,
        quantity: adults,
        unitPrice: price,
        discount: 0,
        totalPrice: price * adults,
      });
    }
    if (children > 0) {
      const childF = forfaits.find((p) => p.personType === "infantil");
      if (childF) {
        const price = getMatrixPrice(childF, days);
        items.push({
          productId: childF.id,
          name: childF.name,
          quantity: children,
          unitPrice: price,
          discount: 0,
          totalPrice: price * children,
        });
      }
    }
  }

  // Equipment rental
  if (services.wantsEquipment) {
    const alquiler = byStation(products, destination, "alquiler");
    const adultPack =
      alquiler.find((p) => p.personType === "adulto" && (p.tier === "media" || p.tier === "media_quality") && p.includesHelmet) ??
      alquiler.find((p) => p.personType === "adulto" && (p.tier === "media" || p.tier === "media_quality")) ??
      alquiler.find((p) => p.personType === "adulto");
    if (adultPack) {
      const price = getMatrixPrice(adultPack, days);
      items.push({
        productId: adultPack.id,
        name: adultPack.name,
        quantity: adults,
        unitPrice: price,
        discount: 0,
        totalPrice: price * adults,
      });
    }
    if (children > 0) {
      const childPack =
        alquiler.find((p) => p.personType === "infantil" && (p.tier === "media" || p.tier === "media_quality")) ??
        alquiler.find((p) => p.personType === "infantil");
      if (childPack) {
        const price = getMatrixPrice(childPack, days);
        items.push({
          productId: childPack.id,
          name: childPack.name,
          quantity: children,
          unitPrice: price,
          discount: 0,
          totalPrice: price * children,
        });
      }
    }
  }

  // Ski school
  if (services.wantsClases) {
    const escuelas = byStation(products, destination, "escuela");
    const curso =
      escuelas.find((p) => p.name.toLowerCase().includes("colectivo")) ??
      escuelas[0];
    if (curso) {
      const totalPax = adults + children;
      const price = getMatrixPrice(curso, days);
      items.push({
        productId: curso.id,
        name: curso.name,
        quantity: totalPax,
        unitPrice: price,
        discount: 0,
        totalPrice: price * totalPax,
      });
    }
  }

  const totalAmount = items.reduce((s, i) => s + i.totalPrice, 0);

  const quote = await prisma.quote.create({
    data: {
      tenantId,
      ghlContactId: contactId ?? null,
      clientName: clientName as string,
      clientEmail,
      clientPhone,
      clientNotes: accommodationNote || null,
      destination,
      checkIn: new Date(rawCheckIn),
      checkOut: new Date(rawCheckOut),
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
    await prisma.quoteItem.createMany({
      data: items.map((item) => ({ ...item, quoteId: quote.id })),
    });
  }

  log.info(
    { tenantId, contactId, destination, itemCount: items.length, totalAmount },
    "Draft quote created from survey"
  );
}
