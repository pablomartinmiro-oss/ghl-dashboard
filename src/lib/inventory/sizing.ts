export type SkillLevel = "beginner" | "intermediate" | "advanced" | "expert";

export interface SizingInput {
  heightCm?: number | null;
  weightKg?: number | null;
  age?: number | null;
  level?: SkillLevel | string | null;
  shoeSize?: string | null;
  headCm?: number | null;
}

export interface SizingRecommendation {
  skiLength?: string;
  bootSize?: string;
  helmetSize?: string;
  notes?: string;
}

const HELMET_RANGES: Array<{ size: string; min: number; max: number }> = [
  { size: "XS", min: 51, max: 53 },
  { size: "S", min: 53, max: 55 },
  { size: "M", min: 55, max: 57 },
  { size: "L", min: 57, max: 59 },
  { size: "XL", min: 59, max: 61 },
  { size: "XXL", min: 61, max: 64 },
];

function recommendSkiLength(heightCm: number, level: SkillLevel): number {
  switch (level) {
    case "beginner":
      return heightCm - 20;
    case "intermediate":
      return heightCm - 10;
    case "advanced":
      return heightCm;
    case "expert":
      return heightCm + 5;
    default:
      return heightCm - 10;
  }
}

function normalizeLevel(level?: string | null): SkillLevel {
  const v = (level ?? "").toLowerCase();
  if (v.startsWith("beg") || v === "principiante") return "beginner";
  if (v.startsWith("int") || v === "intermedio") return "intermediate";
  if (v.startsWith("adv") || v === "avanzado") return "advanced";
  if (v.startsWith("exp") || v === "experto") return "expert";
  return "intermediate";
}

export function helmetSizeFromHeadCm(headCm: number): string {
  for (const range of HELMET_RANGES) {
    if (headCm >= range.min && headCm < range.max) return range.size;
  }
  if (headCm < HELMET_RANGES[0].min) return HELMET_RANGES[0].size;
  return HELMET_RANGES[HELMET_RANGES.length - 1].size;
}

function helmetSizeFromHeight(heightCm: number, age: number | null | undefined): string {
  if (age != null && age <= 6) return "XS";
  if (age != null && age <= 12) return "S";
  if (heightCm < 150) return "S";
  if (heightCm < 170) return "M";
  if (heightCm < 185) return "L";
  return "XL";
}

export function recommendSizes(input: SizingInput): SizingRecommendation {
  const out: SizingRecommendation = {};
  const level = normalizeLevel(input.level);
  const notes: string[] = [];

  if (input.heightCm && input.heightCm > 0) {
    const baseLen = recommendSkiLength(input.heightCm, level);
    let adjusted = baseLen;
    if (input.weightKg && input.heightCm > 0) {
      const ideal = input.heightCm - 110;
      if (input.weightKg > ideal + 15) adjusted += 5;
      else if (input.weightKg < ideal - 15) adjusted -= 5;
    }
    out.skiLength = `${Math.round(adjusted)}cm`;
  }

  if (input.shoeSize) {
    out.bootSize = input.shoeSize;
  }

  if (input.headCm && input.headCm > 0) {
    out.helmetSize = helmetSizeFromHeadCm(input.headCm);
  } else if (input.heightCm && input.heightCm > 0) {
    out.helmetSize = helmetSizeFromHeight(input.heightCm, input.age ?? null);
    notes.push("Casco estimado por altura — medir circunferencia para precisión");
  }

  if (input.age != null && input.age <= 12) {
    notes.push("Niño/a: prefiere flex bajo y esquí más corto para control");
  }

  if (notes.length) out.notes = notes.join(". ");
  return out;
}
