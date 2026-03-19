// Complete Skicenter 2025/2026 Product Catalog
// REAL prices from spreadsheet — DO NOT modify without business approval

interface ProductSeedItem {
  name: string;
  category: string;
  station: string;
  description?: string;
  personType?: string | null;
  tier?: string | null;
  includesHelmet?: boolean;
  priceType: string;
  price: number;
  pricingMatrix: Record<string, unknown>;
  sortOrder: number;
}

// ── Private lesson matrix (shared across all stations) ──────────────
const PRIVATE_LESSON_MATRIX = {
  media: {
    "1h": { "1p": 70, "2p": 75, "3p": 80, "4p": 85, "5p": 90, "6p": 95 },
    "2h": { "1p": 140, "2p": 145, "3p": 150, "4p": 155, "5p": 160, "6p": 165 },
    "3h": { "1p": 210, "2p": 215, "3p": 220, "4p": 225, "5p": 230, "6p": 235 },
    "4h": { "1p": 280, "2p": 285, "3p": 290, "4p": 295, "5p": 300, "6p": 305 },
    "5h": { "1p": 350, "2p": 355, "3p": 360, "4p": 365, "5p": 370, "6p": 375 },
    "6h": { "1p": 420, "2p": 425, "3p": 430, "4p": 435, "5p": 440, "6p": 445 },
  },
  alta: {
    "1h": { "1p": 80, "2p": 85, "3p": 90, "4p": 95, "5p": 100, "6p": 105 },
    "2h": { "1p": 160, "2p": 165, "3p": 170, "4p": 175, "5p": 180, "6p": 185 },
    "3h": { "1p": 240, "2p": 245, "3p": 250, "4p": 255, "5p": 260, "6p": 265 },
    "4h": { "1p": 320, "2p": 325, "3p": 330, "4p": 335, "5p": 340, "6p": 345 },
    "5h": { "1p": 400, "2p": 405, "3p": 410, "4p": 415, "5p": 420, "6p": 425 },
    "6h": { "1p": 480, "2p": 485, "3p": 490, "4p": 495, "5p": 500, "6p": 505 },
  },
};

// ── Equipment rental base data (Baqueira/Sierra Nevada: 1-7 days) ───
interface EquipItem {
  name: string;
  personType?: string | null;
  tier?: string | null;
  includesHelmet: boolean;
  price: number;
  matrix7: Record<string, number>; // 1-7 days (same media & alta)
}

const EQUIP_ITEMS: EquipItem[] = [
  { name: "Equipo completo esquí media adulto (sin casco)", personType: "adulto", tier: "media", includesHelmet: false, price: 36, matrix7: { "1": 36, "2": 72, "3": 108, "4": 144, "5": 147.5, "6": 148.5, "7": 149.5 } },
  { name: "Equipo completo esquí alta adulto (sin casco)", personType: "adulto", tier: "alta", includesHelmet: false, price: 56, matrix7: { "1": 56, "2": 111, "3": 167, "4": 222, "5": 226.5, "6": 231, "7": 232 } },
  { name: "Equipo completo esquí niño (sin casco)", personType: "infantil", tier: null, includesHelmet: false, price: 24.5, matrix7: { "1": 24.5, "2": 48.5, "3": 72.5, "4": 96.5, "5": 101, "6": 102.5, "7": 103.5 } },
  { name: "Equipo completo esquí media adulto (con casco)", personType: "adulto", tier: "media", includesHelmet: true, price: 43, matrix7: { "1": 43, "2": 86, "3": 129, "4": 172, "5": 179.5, "6": 184.5, "7": 189.5 } },
  { name: "Equipo completo esquí alta adulto (con casco)", personType: "adulto", tier: "alta", includesHelmet: true, price: 63, matrix7: { "1": 63, "2": 125, "3": 188, "4": 250, "5": 258.5, "6": 267, "7": 272 } },
  { name: "Equipo completo esquí niño (con casco)", personType: "infantil", tier: null, includesHelmet: true, price: 31.5, matrix7: { "1": 31.5, "2": 62.5, "3": 93.5, "4": 124.5, "5": 133, "6": 138.5, "7": 143.5 } },
  { name: "Casco", personType: null, tier: null, includesHelmet: true, price: 7, matrix7: { "1": 7, "2": 14, "3": 21, "4": 28, "5": 32, "6": 36, "7": 40 } },
  { name: "Botas", personType: null, tier: null, includesHelmet: false, price: 16.8, matrix7: { "1": 16.8, "2": 33.7, "3": 50.5, "4": 67.5, "5": 71.5, "6": 72, "7": 72.5 } },
  { name: "Esquís/tabla infantil", personType: "infantil", tier: null, includesHelmet: false, price: 15.95, matrix7: { "1": 15.95, "2": 31.9, "3": 47.9, "4": 63.8, "5": 66, "6": 67.1, "7": 67.55 } },
  { name: "Esquís/tabla adulto media", personType: "adulto", tier: "media", includesHelmet: false, price: 28.75, matrix7: { "1": 28.75, "2": 57.5, "3": 86.25, "4": 115, "5": 127, "6": 128, "7": 129 } },
  { name: "Esquís/tabla adulto alta", personType: "adulto", tier: "alta", includesHelmet: false, price: 48.25, matrix7: { "1": 48.25, "2": 96.5, "3": 144.75, "4": 193, "5": 205, "6": 206, "7": 207 } },
];

function makeEquipProducts(stations7: string[], station5: string | null): ProductSeedItem[] {
  const items: ProductSeedItem[] = [];
  let sort = 1;
  for (const station of stations7) {
    for (const eq of EQUIP_ITEMS) {
      const m = eq.matrix7;
      items.push({
        name: eq.name, category: "alquiler", station,
        description: eq.name, personType: eq.personType, tier: eq.tier,
        includesHelmet: eq.includesHelmet, priceType: "per_day", price: eq.price,
        pricingMatrix: { media: { ...m }, alta: { ...m } }, sortOrder: sort++,
      });
    }
  }
  if (station5) {
    for (const eq of EQUIP_ITEMS) {
      const m5: Record<string, number> = {};
      for (let d = 1; d <= 5; d++) m5[String(d)] = eq.matrix7[String(d)];
      items.push({
        name: eq.name, category: "alquiler", station: station5,
        description: eq.name, personType: eq.personType, tier: eq.tier,
        includesHelmet: eq.includesHelmet, priceType: "per_day", price: eq.price,
        pricingMatrix: { media: { ...m5 }, alta: { ...m5 } }, sortOrder: sort++,
      });
    }
  }
  return items;
}

// ── Build complete catalog ──────────────────────────────────────────

export function buildFullCatalog(): ProductSeedItem[] {
  const products: ProductSeedItem[] = [];

  // ═══ ALQUILER ═══
  products.push(...makeEquipProducts(["baqueira", "sierra_nevada"], "la_pinilla"));

  // ═══ LOCKERS ═══
  for (const station of ["baqueira", "sierra_nevada"]) {
    products.push(
      { name: "Locker armario 3 equipos", category: "locker", station, priceType: "per_day", price: 20, sortOrder: 100, pricingMatrix: { media: { "1": 20, "2": 40, "3": 60, "4": 78, "5": 95, "6": 99, "7": 118 }, alta: { "1": 20, "2": 40, "3": 60, "4": 78, "5": 95, "6": 99, "7": 118 } } },
      { name: "Guarda individual", category: "locker", station, priceType: "per_day", price: 8, sortOrder: 101, pricingMatrix: { media: { "1": 8, "2": 16, "3": 24, "4": 32, "5": 40, "6": 44, "7": 46 }, alta: { "1": 8, "2": 16, "3": 24, "4": 32, "5": 40, "6": 44, "7": 46 } } },
    );
  }

  // ═══ ESCUELA (Group Lessons) ═══
  for (const station of ["baqueira", "sierra_nevada", "la_pinilla"]) {
    products.push(
      { name: "Curso colectivo 3 horas (10-13 o 13-16)", category: "escuela", station, description: "Todas las edades. Horario 10-13 o 13-16", priceType: "per_day", price: 61, sortOrder: 200, pricingMatrix: { media: { "1": 61, "2": 122, "3": 183, "4": 244, "5": 305, "6": 366, "7": 427 }, alta: { "1": 61, "2": 122, "3": 183, "4": 244, "5": 305, "6": 366, "7": 427 } } },
      { name: "Escuelita 10-15 (niños 4-6 años)", category: "escuela", station, description: "Solo niños de 4 a 6 años. Horario 10-15", personType: "baby", priceType: "per_day", price: 75, sortOrder: 201, pricingMatrix: { media: { "1": 75, "2": 150, "3": 225, "4": 300, "5": 375, "6": 450, "7": 525 }, alta: { "1": 75, "2": 150, "3": 225, "4": 300, "5": 375, "6": 450, "7": 525 } } },
    );
  }

  // ═══ CLASES PARTICULARES ═══
  products.push(
    { name: "Clase particular esquí/snow — Sector Baqueira", category: "clase_particular", station: "baqueira", description: "Clase particular en sector Baqueira", priceType: "per_person_per_hour", price: 70, sortOrder: 300, pricingMatrix: PRIVATE_LESSON_MATRIX },
    { name: "Clase particular esquí/snow — Sector Beret", category: "clase_particular", station: "baqueira", description: "Clase particular en sector Beret", priceType: "per_person_per_hour", price: 70, sortOrder: 301, pricingMatrix: PRIVATE_LESSON_MATRIX },
  );
  for (const station of ["sierra_nevada", "valdesqui", "la_pinilla"]) {
    products.push({
      name: "Clase particular esquí/snow", category: "clase_particular", station,
      description: "Clase particular esquí o snowboard", priceType: "per_person_per_hour",
      price: 70, sortOrder: 302, pricingMatrix: PRIVATE_LESSON_MATRIX,
    });
  }

  // ═══ FORFAITS — Baqueira ═══
  products.push(
    { name: "Forfait adulto", category: "forfait", station: "baqueira", personType: "adulto", priceType: "per_day", price: 74, sortOrder: 400, pricingMatrix: { media: { "1": 74, "2": 159.2, "3": 233, "4": 295.4, "5": 354.2, "6": 406.4, "7": 440 }, alta: { "1": 74, "2": 159.2, "3": 233, "4": 295.4, "5": 354.2, "6": 406.4, "7": 440 } } },
    { name: "Forfait infantil (6-11 años)", category: "forfait", station: "baqueira", personType: "infantil", priceType: "per_day", price: 51, sortOrder: 401, pricingMatrix: { media: { "1": 51, "2": 99.8, "3": 146.6, "4": 186.8, "5": 226.4, "6": 261.2, "7": 277.4 }, alta: { "1": 51, "2": 99.8, "3": 146.6, "4": 186.8, "5": 226.4, "6": 261.2, "7": 277.4 } } },
    { name: "Forfait baby (≤5 años)", category: "forfait", station: "baqueira", personType: "baby", priceType: "per_day", price: 14.5, sortOrder: 402, pricingMatrix: { media: { "1": 14.5, "2": 22, "3": 30, "4": 38, "5": 46.5, "6": 54.5, "7": 63 }, alta: { "1": 14.5, "2": 22, "3": 30, "4": 38, "5": 46.5, "6": 54.5, "7": 63 } } },
    { name: "Seguro forfait", category: "forfait", station: "baqueira", description: "Seguro para el forfait", priceType: "per_day", price: 5.5, sortOrder: 403, pricingMatrix: { media: { "1": 5.5, "2": 11, "3": 16.5, "4": 22, "5": 27.5, "6": 33, "7": 38.5 }, alta: { "1": 5.5, "2": 11, "3": 16.5, "4": 22, "5": 27.5, "6": 33, "7": 38.5 } } },
  );

  // ═══ FORFAITS — Sierra Nevada ═══
  products.push(
    { name: "Forfait adulto", category: "forfait", station: "sierra_nevada", personType: "adulto", priceType: "per_day", price: 69, sortOrder: 410, pricingMatrix: { media: { "1": 69, "2": 138, "3": 207, "4": 276, "5": 345, "6": 414, "7": 483 }, alta: { "1": 69, "2": 138, "3": 207, "4": 276, "5": 345, "6": 414, "7": 483 } } },
    { name: "Forfait infantil (6-11 años)", category: "forfait", station: "sierra_nevada", personType: "infantil", priceType: "per_day", price: 61, sortOrder: 411, pricingMatrix: { media: { "1": 61, "2": 122, "3": 183, "4": 244, "5": 305, "6": 366, "7": 427 }, alta: { "1": 61, "2": 122, "3": 183, "4": 244, "5": 305, "6": 366, "7": 427 } } },
    { name: "Forfait baby (≤5 años)", category: "forfait", station: "sierra_nevada", personType: "baby", priceType: "per_day", price: 61, sortOrder: 412, pricingMatrix: { media: { "1": 61, "2": 122, "3": 183, "4": 244, "5": 305, "6": 366, "7": 427 }, alta: { "1": 61, "2": 122, "3": 183, "4": 244, "5": 305, "6": 366, "7": 427 } } },
    { name: "Seguro forfait", category: "forfait", station: "sierra_nevada", description: "Seguro para el forfait", priceType: "per_day", price: 5.5, sortOrder: 413, pricingMatrix: { media: { "1": 5.5, "2": 11, "3": 16.5, "4": 22, "5": 27.5, "6": 33, "7": 38.5 }, alta: { "1": 5.5, "2": 11, "3": 16.5, "4": 22, "5": 27.5, "6": 33, "7": 38.5 } } },
  );

  // ═══ FORFAITS — La Pinilla (max 5 days) ═══
  products.push(
    { name: "Forfait adulto (12-64 años)", category: "forfait", station: "la_pinilla", personType: "adulto", priceType: "per_day", price: 45, sortOrder: 420, pricingMatrix: { media: { "1": 45, "2": 90, "3": 135, "4": 180, "5": 225 }, alta: { "1": 45, "2": 90, "3": 135, "4": 180, "5": 225 } } },
    { name: "Forfait infantil (6-11 años)", category: "forfait", station: "la_pinilla", personType: "infantil", priceType: "per_day", price: 26, sortOrder: 421, pricingMatrix: { media: { "1": 26, "2": 52, "3": 78, "4": 104, "5": 130 }, alta: { "1": 26, "2": 52, "3": 78, "4": 104, "5": 130 } } },
  );

  // ═══ MENÚ ═══
  for (const station of ["baqueira", "sierra_nevada"]) {
    products.push({
      name: "Menú bocadillo", category: "menu", station,
      description: "Menú de bocadillo en pistas", priceType: "per_day", price: 22, sortOrder: 500,
      pricingMatrix: { media: { "1": 22, "2": 44, "3": 66, "4": 86, "5": 102, "6": 118, "7": 125 }, alta: { "1": 22, "2": 44, "3": 66, "4": 86, "5": 102, "6": 118, "7": 125 } },
    });
  }

  // ═══ SNOWCAMP (Baqueira only) ═══
  products.push(
    { name: "SnowCamp 1800 — Día completo (09:00-16:30)", category: "snowcamp", station: "baqueira", description: "Niños de 3 a 7 años. Día completo", personType: "baby", priceType: "per_day", price: 65, sortOrder: 600, pricingMatrix: { media: { "1": 65, "2": 130, "3": 195, "4": 260, "5": 325 }, alta: { "1": 65, "2": 130, "3": 195, "4": 260, "5": 325 } } },
    { name: "SnowCamp 1800 — Mañana (09:00-14:00)", category: "snowcamp", station: "baqueira", description: "Niños de 3 a 7 años. Solo mañana", personType: "baby", priceType: "per_day", price: 50.5, sortOrder: 601, pricingMatrix: { media: { "1": 50.5, "2": 101, "3": 151.5, "4": 202, "5": 252.5 }, alta: { "1": 50.5, "2": 101, "3": 151.5, "4": 202, "5": 252.5 } } },
    { name: "SnowCamp 1800 — Tarde (13:00-16:30)", category: "snowcamp", station: "baqueira", description: "Niños de 3 a 6 años. Solo tarde", personType: "baby", priceType: "per_day", price: 44.5, sortOrder: 602, pricingMatrix: { media: { "1": 44.5, "2": 89, "3": 133.5, "4": 178, "5": 222.5 }, alta: { "1": 44.5, "2": 89, "3": 133.5, "4": 178, "5": 222.5 } } },
    { name: "SnowCamp 1500 — Día completo (08:30-16:45)", category: "snowcamp", station: "baqueira", description: "Niños de 6 meses a 3 años. Día completo", personType: "baby", priceType: "per_day", price: 73, sortOrder: 603, pricingMatrix: { media: { "1": 73, "2": 146, "3": 219, "4": 292, "5": 365 }, alta: { "1": 73, "2": 146, "3": 219, "4": 292, "5": 365 } } },
    { name: "SnowCamp 1500 — Mañana (08:30-14:00)", category: "snowcamp", station: "baqueira", description: "Niños de 6 meses a 3 años. Solo mañana", personType: "baby", priceType: "per_day", price: 57, sortOrder: 604, pricingMatrix: { media: { "1": 57, "2": 114, "3": 151.5, "4": 208.5, "5": 265.5 }, alta: { "1": 57, "2": 114, "3": 151.5, "4": 208.5, "5": 265.5 } } },
    { name: "SnowCamp 1500 — Tarde (13:00-16:45)", category: "snowcamp", station: "baqueira", description: "Niños de 6 meses a 3 años. Solo tarde", personType: "baby", priceType: "per_day", price: 51, sortOrder: 605, pricingMatrix: { media: { "1": 51, "2": 102, "3": 153, "4": 204, "5": 255 }, alta: { "1": 51, "2": 102, "3": 153, "4": 204, "5": 255 } } },
    { name: "Baby Beret — Día completo (09:00-16:30)", category: "snowcamp", station: "baqueira", description: "Niños de 3 a 6 años. Día completo", personType: "baby", priceType: "per_day", price: 69, sortOrder: 606, pricingMatrix: { media: { "1": 69, "2": 138, "3": 207, "4": 276, "5": 345 }, alta: { "1": 69, "2": 138, "3": 207, "4": 276, "5": 345 } } },
    { name: "Baby Beret — Mañana (09:00-14:00)", category: "snowcamp", station: "baqueira", description: "Niños de 3 a 6 años. Solo mañana", personType: "baby", priceType: "per_day", price: 54.5, sortOrder: 607, pricingMatrix: { media: { "1": 54.5, "2": 109, "3": 151.5, "4": 206, "5": 260.5 }, alta: { "1": 54.5, "2": 109, "3": 151.5, "4": 206, "5": 260.5 } } },
    { name: "Baby Beret — Tarde (13:00-16:30)", category: "snowcamp", station: "baqueira", description: "Niños de 3 a 6 años. Solo tarde", personType: "baby", priceType: "per_day", price: 49, sortOrder: 608, pricingMatrix: { media: { "1": 49, "2": 98, "3": 147, "4": 196, "5": 245 }, alta: { "1": 49, "2": 98, "3": 147, "4": 196, "5": 245 } } },
  );

  // ═══ APRÈS-SKI / ACTIVIDADES (Baqueira only) ═══
  products.push(
    { name: "Moto de nieve biplaza + comida (Montgarri)", category: "apreski", station: "baqueira", description: "Excursión en moto de nieve biplaza con comida en Montgarri", priceType: "fixed", price: 190, sortOrder: 700, pricingMatrix: { media: { "1": 190 }, alta: { "1": 190 } } },
    { name: "Moto de nieve individual + comida (Montgarri)", category: "apreski", station: "baqueira", priceType: "fixed", price: 250, sortOrder: 701, pricingMatrix: { media: { "1": 250 }, alta: { "1": 250 } } },
    { name: "Moto de nieve biplaza + cena (Montgarri)", category: "apreski", station: "baqueira", priceType: "fixed", price: 220, sortOrder: 702, pricingMatrix: { media: { "1": 220 }, alta: { "1": 220 } } },
    { name: "Moto de nieve individual + cena (Montgarri)", category: "apreski", station: "baqueira", priceType: "fixed", price: 260, sortOrder: 703, pricingMatrix: { media: { "1": 260 }, alta: { "1": 260 } } },
    { name: "Moto de nieve biplaza — solo moto (Montgarri)", category: "apreski", station: "baqueira", priceType: "fixed", price: 130, sortOrder: 704, pricingMatrix: { media: { "1": 130 }, alta: { "1": 130 } } },
    { name: "Moto de nieve individual — solo moto (Montgarri)", category: "apreski", station: "baqueira", priceType: "fixed", price: 180, sortOrder: 705, pricingMatrix: { media: { "1": 180 }, alta: { "1": 180 } } },
    { name: "Trineo de perros adulto + comida (Montgarri)", category: "apreski", station: "baqueira", personType: "adulto", priceType: "fixed", price: 165, sortOrder: 706, pricingMatrix: { media: { "1": 165 }, alta: { "1": 165 } } },
    { name: "Trineo de perros niño + comida (Montgarri)", category: "apreski", station: "baqueira", personType: "infantil", priceType: "fixed", price: 145, sortOrder: 707, pricingMatrix: { media: { "1": 145 }, alta: { "1": 145 } } },
    { name: "Trineo de perros adulto + cena (Montgarri)", category: "apreski", station: "baqueira", personType: "adulto", priceType: "fixed", price: 198, sortOrder: 708, pricingMatrix: { media: { "1": 198 }, alta: { "1": 198 } } },
    { name: "Trineo de perros niño + cena (Montgarri)", category: "apreski", station: "baqueira", personType: "infantil", priceType: "fixed", price: 168, sortOrder: 709, pricingMatrix: { media: { "1": 168 }, alta: { "1": 168 } } },
    { name: "Trineo de perros adulto — solo trineo 20 min", category: "apreski", station: "baqueira", personType: "adulto", priceType: "fixed", price: 150, sortOrder: 710, pricingMatrix: { media: { "1": 150 }, alta: { "1": 150 } } },
    { name: "Trineo de perros niño — solo trineo 20 min", category: "apreski", station: "baqueira", personType: "infantil", priceType: "fixed", price: 85, sortOrder: 711, pricingMatrix: { media: { "1": 85 }, alta: { "1": 85 } } },
  );

  // ═══ TAXI / TRANSFERS (Baqueira only) ═══
  products.push(
    { name: "Taxi Baqueira a pista", category: "taxi", station: "baqueira", priceType: "fixed", price: 65, sortOrder: 800, pricingMatrix: { media: { "1": 65 }, alta: { "1": 65 } } },
    { name: "Taxi Baqueira — Lleida", category: "taxi", station: "baqueira", priceType: "fixed", price: 450, sortOrder: 801, pricingMatrix: { media: { "1": 450 }, alta: { "1": 450 } } },
    { name: "Taxi Baqueira — Barcelona", category: "taxi", station: "baqueira", priceType: "fixed", price: 450, sortOrder: 802, pricingMatrix: { media: { "1": 450 }, alta: { "1": 450 } } },
    { name: "Taxi Baqueira — Toulouse", category: "taxi", station: "baqueira", priceType: "fixed", price: 450, sortOrder: 803, pricingMatrix: { media: { "1": 450 }, alta: { "1": 450 } } },
  );

  // ═══ PACKS ALL-IN-ONE (Baqueira + Sierra Nevada) ═══
  for (const station of ["baqueira", "sierra_nevada"]) {
    products.push(
      { name: "All in One: Forfait + Alquiler + Curso Adulto", category: "pack", station, description: "Forfait + Equipo completo sin casco + Curso colectivo 3h", personType: "adulto", priceType: "bundle", price: 0, sortOrder: 900, pricingMatrix: { type: "bundle", components: ["forfait_adulto", "equipo_media_adulto_sin_casco", "curso_colectivo"] } },
      { name: "All in One: Forfait + Alquiler + Curso Niño (6-11)", category: "pack", station, description: "Forfait infantil + Equipo completo sin casco niño + Curso colectivo 3h", personType: "infantil", priceType: "bundle", price: 0, sortOrder: 901, pricingMatrix: { type: "bundle", components: ["forfait_infantil", "equipo_nino_sin_casco", "curso_colectivo"] } },
      { name: "All in One: Forfait + Alquiler + Curso Baby", category: "pack", station, description: "Forfait baby + Equipo completo sin casco niño + Curso colectivo 3h", personType: "baby", priceType: "bundle", price: 0, sortOrder: 902, pricingMatrix: { type: "bundle", components: ["forfait_baby", "equipo_nino_sin_casco", "curso_colectivo"] } },
      { name: "All in One: Forfait + Alquiler + Escuelita Baby", category: "pack", station, description: "Forfait baby + Equipo completo sin casco niño + Escuelita 10-15", personType: "baby", priceType: "bundle", price: 0, sortOrder: 903, pricingMatrix: { type: "bundle", components: ["forfait_baby", "equipo_nino_sin_casco", "escuelita"] } },
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ⚠️  PLACEHOLDER PRICES — Replace with real pricing from Jorge/Skicenter
  // ═══════════════════════════════════════════════════════════════════

  // ═══ CANDANCHÚ / ASTÚN (placeholder) ═══
  products.push(
    { name: "Forfait adulto (placeholder)", category: "forfait", station: "candanchu", personType: "adulto", priceType: "per_day", price: 40, sortOrder: 1000, pricingMatrix: { media: { "1": 40, "2": 78, "3": 114, "4": 148, "5": 180, "6": 210, "7": 238 }, alta: { "1": 45, "2": 88, "3": 129, "4": 168, "5": 205, "6": 240, "7": 273 } } },
    { name: "Forfait infantil (placeholder)", category: "forfait", station: "candanchu", personType: "infantil", priceType: "per_day", price: 28, sortOrder: 1001, pricingMatrix: { media: { "1": 28, "2": 54, "3": 78, "4": 100, "5": 120, "6": 138, "7": 154 }, alta: { "1": 32, "2": 62, "3": 90, "4": 116, "5": 140, "6": 162, "7": 182 } } },
    { name: "Alquiler esquí adulto media calidad (placeholder)", category: "alquiler", station: "candanchu", personType: "adulto", tier: "media", includesHelmet: false, priceType: "per_day", price: 22, sortOrder: 1010, pricingMatrix: { media: { "1": 22, "2": 40, "3": 56, "4": 70, "5": 82, "6": 92, "7": 100 }, alta: { "1": 25, "2": 46, "3": 65, "4": 82, "5": 97, "6": 110, "7": 121 } } },
    { name: "Alquiler esquí infantil media calidad (placeholder)", category: "alquiler", station: "candanchu", personType: "infantil", tier: "media", includesHelmet: false, priceType: "per_day", price: 18, sortOrder: 1011, pricingMatrix: { media: { "1": 18, "2": 32, "3": 44, "4": 54, "5": 62, "6": 68, "7": 72 }, alta: { "1": 20, "2": 36, "3": 50, "4": 62, "5": 72, "6": 80, "7": 86 } } },
    { name: "Curso colectivo esquí (placeholder)", category: "escuela", station: "candanchu", priceType: "per_day", price: 30, sortOrder: 1020, pricingMatrix: { media: { "1": 30, "2": 56, "3": 78, "4": 96, "5": 110 }, alta: { "1": 34, "2": 64, "3": 90, "4": 112, "5": 130 } } },
  );

  // ═══ FORMIGAL / CERLER (placeholder) ═══
  products.push(
    { name: "Forfait adulto (placeholder)", category: "forfait", station: "formigal", personType: "adulto", priceType: "per_day", price: 48, sortOrder: 1100, pricingMatrix: { media: { "1": 48, "2": 94, "3": 138, "4": 180, "5": 220, "6": 258, "7": 294 }, alta: { "1": 54, "2": 106, "3": 156, "4": 204, "5": 250, "6": 294, "7": 336 } } },
    { name: "Forfait infantil (placeholder)", category: "forfait", station: "formigal", personType: "infantil", priceType: "per_day", price: 33, sortOrder: 1101, pricingMatrix: { media: { "1": 33, "2": 64, "3": 93, "4": 120, "5": 145, "6": 168, "7": 189 }, alta: { "1": 37, "2": 72, "3": 105, "4": 136, "5": 165, "6": 192, "7": 217 } } },
    { name: "Alquiler esquí adulto media calidad (placeholder)", category: "alquiler", station: "formigal", personType: "adulto", tier: "media", includesHelmet: false, priceType: "per_day", price: 25, sortOrder: 1110, pricingMatrix: { media: { "1": 25, "2": 46, "3": 65, "4": 82, "5": 97, "6": 110, "7": 121 }, alta: { "1": 28, "2": 52, "3": 74, "4": 94, "5": 112, "6": 128, "7": 142 } } },
    { name: "Alquiler esquí infantil media calidad (placeholder)", category: "alquiler", station: "formigal", personType: "infantil", tier: "media", includesHelmet: false, priceType: "per_day", price: 20, sortOrder: 1111, pricingMatrix: { media: { "1": 20, "2": 36, "3": 50, "4": 62, "5": 72, "6": 80, "7": 86 }, alta: { "1": 22, "2": 40, "3": 56, "4": 70, "5": 82, "6": 92, "7": 100 } } },
    { name: "Curso colectivo esquí (placeholder)", category: "escuela", station: "formigal", priceType: "per_day", price: 32, sortOrder: 1120, pricingMatrix: { media: { "1": 32, "2": 60, "3": 84, "4": 104, "5": 120 }, alta: { "1": 36, "2": 68, "3": 96, "4": 120, "5": 140 } } },
  );

  // ═══ ALTO CAMPOO (placeholder) ═══
  products.push(
    { name: "Forfait adulto (placeholder)", category: "forfait", station: "alto_campoo", personType: "adulto", priceType: "per_day", price: 35, sortOrder: 1200, pricingMatrix: { media: { "1": 35, "2": 68, "3": 99, "4": 128, "5": 155, "6": 180, "7": 203 }, alta: { "1": 40, "2": 78, "3": 114, "4": 148, "5": 180, "6": 210, "7": 238 } } },
    { name: "Forfait infantil (placeholder)", category: "forfait", station: "alto_campoo", personType: "infantil", priceType: "per_day", price: 24, sortOrder: 1201, pricingMatrix: { media: { "1": 24, "2": 46, "3": 66, "4": 84, "5": 100, "6": 114, "7": 126 }, alta: { "1": 28, "2": 54, "3": 78, "4": 100, "5": 120, "6": 138, "7": 154 } } },
    { name: "Alquiler esquí adulto media calidad (placeholder)", category: "alquiler", station: "alto_campoo", personType: "adulto", tier: "media", includesHelmet: false, priceType: "per_day", price: 20, sortOrder: 1210, pricingMatrix: { media: { "1": 20, "2": 36, "3": 50, "4": 62, "5": 72, "6": 80, "7": 86 }, alta: { "1": 22, "2": 40, "3": 56, "4": 70, "5": 82, "6": 92, "7": 100 } } },
    { name: "Alquiler esquí infantil media calidad (placeholder)", category: "alquiler", station: "alto_campoo", personType: "infantil", tier: "media", includesHelmet: false, priceType: "per_day", price: 16, sortOrder: 1211, pricingMatrix: { media: { "1": 16, "2": 28, "3": 38, "4": 46, "5": 52, "6": 56, "7": 58 }, alta: { "1": 18, "2": 32, "3": 44, "4": 54, "5": 62, "6": 68, "7": 72 } } },
    { name: "Curso colectivo esquí (placeholder)", category: "escuela", station: "alto_campoo", priceType: "per_day", price: 26, sortOrder: 1220, pricingMatrix: { media: { "1": 26, "2": 48, "3": 66, "4": 80, "5": 90 }, alta: { "1": 30, "2": 56, "3": 78, "4": 96, "5": 110 } } },
  );

  // ═══ GRANDVALIRA / ANDORRA (placeholder) ═══
  products.push(
    { name: "Forfait adulto (placeholder)", category: "forfait", station: "grandvalira", personType: "adulto", priceType: "per_day", price: 55, sortOrder: 1300, pricingMatrix: { media: { "1": 55, "2": 108, "3": 159, "4": 208, "5": 255, "6": 300, "7": 343 }, alta: { "1": 62, "2": 122, "3": 180, "4": 236, "5": 290, "6": 342, "7": 392 } } },
    { name: "Forfait infantil (placeholder)", category: "forfait", station: "grandvalira", personType: "infantil", priceType: "per_day", price: 38, sortOrder: 1301, pricingMatrix: { media: { "1": 38, "2": 74, "3": 108, "4": 140, "5": 170, "6": 198, "7": 224 }, alta: { "1": 43, "2": 84, "3": 123, "4": 160, "5": 195, "6": 228, "7": 259 } } },
    { name: "Alquiler esquí adulto media calidad (placeholder)", category: "alquiler", station: "grandvalira", personType: "adulto", tier: "media", includesHelmet: false, priceType: "per_day", price: 28, sortOrder: 1310, pricingMatrix: { media: { "1": 28, "2": 52, "3": 74, "4": 94, "5": 112, "6": 128, "7": 142 }, alta: { "1": 32, "2": 60, "3": 86, "4": 110, "5": 132, "6": 152, "7": 170 } } },
    { name: "Alquiler esquí infantil media calidad (placeholder)", category: "alquiler", station: "grandvalira", personType: "infantil", tier: "media", includesHelmet: false, priceType: "per_day", price: 22, sortOrder: 1311, pricingMatrix: { media: { "1": 22, "2": 40, "3": 56, "4": 70, "5": 82, "6": 92, "7": 100 }, alta: { "1": 25, "2": 46, "3": 65, "4": 82, "5": 97, "6": 110, "7": 121 } } },
    { name: "Curso colectivo esquí (placeholder)", category: "escuela", station: "grandvalira", priceType: "per_day", price: 35, sortOrder: 1320, pricingMatrix: { media: { "1": 35, "2": 66, "3": 93, "4": 116, "5": 135 }, alta: { "1": 40, "2": 76, "3": 108, "4": 136, "5": 160 } } },
  );

  return products;
}

// ── Season Calendar ─────────────────────────────────────────────────

export const SEASON_CALENDAR = [
  { station: "all", season: "alta", startDate: "2025-12-20", endDate: "2026-01-06", label: "Navidades" },
  { station: "all", season: "alta", startDate: "2026-02-13", endDate: "2026-02-28", label: "Carnaval / Semana blanca" },
  { station: "all", season: "alta", startDate: "2026-03-27", endDate: "2026-04-11", label: "Semana Santa" },
  { station: "all", season: "media", startDate: "2025-11-15", endDate: "2025-12-19", label: "Inicio temporada" },
  { station: "all", season: "media", startDate: "2026-01-07", endDate: "2026-02-12", label: "Enero-Febrero" },
  { station: "all", season: "media", startDate: "2026-03-01", endDate: "2026-03-26", label: "Marzo" },
  { station: "all", season: "media", startDate: "2026-04-12", endDate: "2026-04-30", label: "Fin temporada" },
];
