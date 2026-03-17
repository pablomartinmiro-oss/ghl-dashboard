import type { Product } from "@/hooks/useProducts";
import type { Season, DayPricingMatrix } from "@/lib/pricing/types";

interface QuoteFormData {
  destination: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  wantsAccommodation: boolean;
  wantsForfait: boolean;
  wantsClases: boolean;
  wantsEquipment: boolean;
}

interface PackageItem {
  productId: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  breakdown?: string;
}

interface Upsell {
  product: Product;
  reason: string;
}

function getDays(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

function getMatrixPrice(product: Product, season: Season, days: number): number {
  if (product.pricingMatrix) {
    const matrix = product.pricingMatrix as unknown as DayPricingMatrix;
    const seasonPrices = matrix[season];
    if (seasonPrices) {
      const dayStr = String(days);
      if (seasonPrices[dayStr] !== undefined) return seasonPrices[dayStr];
      const keys = Object.keys(seasonPrices).map(Number).sort((a, b) => a - b);
      if (days > keys[keys.length - 1]) return seasonPrices[String(keys[keys.length - 1])];
      return (seasonPrices["1"] || product.price) * days;
    }
  }
  return product.price * days;
}

function findByStation(products: Product[], station: string, category: string): Product[] {
  return products.filter(
    (p) => p.category === category && (p.station === station || p.station === "all") && p.isActive
  );
}

/** Find equipment product — supports both old "media_quality" and new "media" tier */
function findEquipPack(
  alquiler: Product[], personType: string, withHelmet: boolean
): Product | undefined {
  if (withHelmet) {
    return alquiler.find((p) => p.personType === personType && (p.tier === "media_quality" || p.tier === "media") && p.includesHelmet)
      || alquiler.find((p) => p.personType === personType && (p.tier === "media_quality" || p.tier === "media"));
  }
  return alquiler.find((p) => p.personType === personType && p.includesHelmet)
    || alquiler.find((p) => p.personType === personType && !p.tier);
}

const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

function addItem(
  items: PackageItem[], product: Product, season: Season, days: number, qty: number, label: string
) {
  const price = getMatrixPrice(product, season, days);
  items.push({
    productId: product.id, name: product.name, description: product.description,
    quantity: qty, unitPrice: price, discount: 0, totalPrice: price * qty,
    breakdown: `${days} días × ${label} = ${EUR.format(price * qty)}`,
  });
}

export function autoGeneratePackage(
  formData: QuoteFormData,
  products: Product[],
  season: Season = "media"
): { items: PackageItem[]; upsells: Upsell[] } {
  const items: PackageItem[] = [];
  const upsells: Upsell[] = [];
  const days = getDays(formData.checkIn, formData.checkOut);
  const station = formData.destination;

  // 1. Forfaits
  if (formData.wantsForfait) {
    const forfaits = findByStation(products, station, "forfait");
    const adultF = forfaits.find((p) => p.personType === "adulto");
    if (adultF && formData.adults > 0) addItem(items, adultF, season, days, formData.adults, `${formData.adults} adultos`);
    if (formData.children > 0) {
      const childF = forfaits.find((p) => p.personType === "infantil");
      if (childF) addItem(items, childF, season, days, formData.children, `${formData.children} niños`);
    }
  }

  // 2. Classes (group courses)
  if (formData.wantsClases) {
    const escuelas = findByStation(products, station, "escuela");
    const curso = escuelas.find((p) => p.name.includes("Curso colectivo") || p.name.includes("colectivo"));
    if (curso) {
      const totalPax = formData.adults + formData.children;
      addItem(items, curso, season, days, totalPax, `${totalPax} pers.`);
    }
  }

  // 3. Equipment Rental
  if (formData.wantsEquipment) {
    const alquiler = findByStation(products, station, "alquiler");
    if (formData.adults > 0) {
      const pack = findEquipPack(alquiler, "adulto", true);
      if (pack) addItem(items, pack, season, days, formData.adults, `${formData.adults} adultos`);
    }
    if (formData.children > 0) {
      const pack = findEquipPack(alquiler, "infantil", true);
      if (pack) addItem(items, pack, season, days, formData.children, `${formData.children} niños`);
    }
  }

  // 4. Upsells — après-ski, menu, locker, snowcamp, taxi
  const upsellCategories = ["apreski", "menu", "locker", "snowcamp", "taxi"];
  const upsellReasons: Record<string, string> = {
    apreski: "Actividad complementaria", menu: "Menú en pistas",
    locker: "Guardaropa", snowcamp: "Guardería infantil", taxi: "Transfer",
  };
  for (const cat of upsellCategories) {
    const catProducts = findByStation(products, station, cat);
    for (const product of catProducts) {
      if (product.priceType !== "bundle") {
        upsells.push({ product, reason: upsellReasons[cat] || cat });
      }
    }
  }

  return { items, upsells };
}

export type { PackageItem, Upsell, QuoteFormData };
