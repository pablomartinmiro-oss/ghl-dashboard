import type { Product } from "@/hooks/useProducts";

/** Map participant service names to product categories for price lookup */
export const SERVICE_CATEGORY_MAP: Record<string, string> = {
  "Cursillo 3d": "escuela",
  "Cursillo 5d": "escuela",
  "Clase particular": "clase_particular",
  "Escuelita": "escuela",
  "Forfait": "forfait",
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
  return 1;
}

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
