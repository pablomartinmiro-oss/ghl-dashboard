import type { Product } from "@/hooks/useProducts";

/** Map participant service names to product categories for price lookup */
export const SERVICE_CATEGORY_MAP: Record<string, string> = {
  "Cursillo 3d": "escuela",
  "Cursillo 5d": "escuela",
  "Clase particular": "clase_particular",
  "Escuelita": "escuela",
  "Forfait": "forfait",
  "Menú bocadillo": "menu",
  "SnowCamp día completo": "snowcamp",
  "SnowCamp mañana": "snowcamp",
  "SnowCamp tarde": "snowcamp",
};

export interface PriceLineItem {
  label: string;
  unitPrice: number;
  quantity: number;
  days: number;
  subtotal: number;
}

/** Get number of days for a given service */
export function getServiceDays(service: string): number {
  if (service === "Cursillo 3d") return 3;
  if (service === "Cursillo 5d") return 5;
  // SnowCamp, Menú, Forfait etc. are per-day
  return 1;
}

/** Map service name to product name search hint for better matching */
const SERVICE_NAME_HINTS: Record<string, string> = {
  "Cursillo 3d": "Curso colectivo",
  "Cursillo 5d": "Curso colectivo",
  "Escuelita": "Escuelita",
  "Menú bocadillo": "Menú bocadillo",
  "SnowCamp día completo": "Día completo",
  "SnowCamp mañana": "Mañana",
  "SnowCamp tarde": "Tarde",
};

/** Find best matching product for a participant's service */
export function findProductForService(
  products: Product[],
  service: string,
  personType: string,
  station: string
): Product | null {
  const category = SERVICE_CATEGORY_MAP[service];
  if (!category) return null;

  const stationMatch = products.filter(
    (p) => p.category === category && (p.station === station || p.station === "all") && p.isActive
  );

  // Use name hint for categories with multiple products (e.g. SnowCamp)
  const hint = SERVICE_NAME_HINTS[service];
  if (hint) {
    const nameMatch = stationMatch.filter((p) => p.name.includes(hint));
    const typedName = nameMatch.filter((p) =>
      p.personType === personType || (!p.personType && personType === "adulto")
    );
    if (typedName.length > 0) {
      const preferred = typedName.filter((p) => p.station === station);
      return preferred[0] || typedName[0];
    }
    if (nameMatch.length > 0) return nameMatch[0];
  }

  const typed = stationMatch.filter((p) =>
    p.personType === personType || (!p.personType && personType === "adulto")
  );

  const preferred = typed.filter((p) => p.station === station);
  return preferred[0] || typed[0] || stationMatch[0] || null;
}

/** Find equipment rental product for a participant */
export function findEquipmentProduct(
  products: Product[],
  personType: string,
  station: string
): Product | null {
  const stationMatch = products.filter(
    (p) => p.category === "alquiler" && (p.station === station || p.station === "all") && p.isActive
  );
  const withHelmet = stationMatch.filter(
    (p) =>
      p.includesHelmet &&
      (p.tier === "media_quality" || p.tier === "media") &&
      (p.personType === personType || (!p.personType && personType === "adulto"))
  );
  if (withHelmet.length > 0) return withHelmet[0];

  const typed = stationMatch.filter(
    (p) => p.personType === personType || (!p.personType && personType === "adulto")
  );
  return typed[0] || stationMatch[0] || null;
}
