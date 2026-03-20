/**
 * Fuzzy destination normalization for surveys.
 * Uses case-insensitive includes() matching — not exact match.
 * Returns a canonical slug + array of station slugs for product lookup.
 */

export interface NormalizedDestination {
  /** Canonical slug stored in the quote (e.g. "baqueira") */
  slug: string;
  /** Station slugs to search for products — may span multiple stations */
  stations: string[];
}

// Order matters — first match wins. Pattern is matched with includes().
const RULES: ReadonlyArray<{
  match: string;
  slug: string;
  stations: string[];
}> = [
  // ── Baqueira cluster ──────────────────────────────────────────────
  { match: "baqueira", slug: "baqueira", stations: ["baqueira", "grandvalira"] },

  // ── Grandvalira (Andorra) → shares products with Baqueira ─────────
  { match: "grandvalira", slug: "grandvalira", stations: ["grandvalira", "baqueira"] },
  { match: "andorra", slug: "grandvalira", stations: ["grandvalira", "baqueira"] },

  // ── Candanchú (handles accent: Candanchú / Candanchu) ─────────────
  { match: "candanch", slug: "candanchu", stations: ["candanchu"] },
  { match: "astún", slug: "candanchu", stations: ["candanchu"] },
  { match: "astun", slug: "candanchu", stations: ["candanchu"] },

  // ── Formigal (includes Cerler — Cerler goes first) ────────────────
  { match: "cerler", slug: "formigal", stations: ["formigal"] },
  { match: "formigal", slug: "formigal", stations: ["formigal"] },

  // ── Sierra Nevada ─────────────────────────────────────────────────
  { match: "sierra nevada", slug: "sierra_nevada", stations: ["sierra_nevada"] },

  // ── Alto Campoo (catches "Alto Campo" misspelling too) ────────────
  { match: "alto camp", slug: "alto_campoo", stations: ["alto_campoo"] },

  // ── Sierra de Madrid + Pinilla + Snowzone cluster ─────────────────
  { match: "sierra de madrid", slug: "sierra_de_madrid", stations: ["sierra_de_madrid", "la_pinilla", "snowzone"] },
  { match: "pinilla", slug: "la_pinilla", stations: ["la_pinilla", "sierra_de_madrid", "snowzone"] },
  { match: "snowzone", slug: "snowzone", stations: ["snowzone", "la_pinilla", "sierra_de_madrid"] },
  { match: "valdesqu", slug: "sierra_de_madrid", stations: ["sierra_de_madrid", "la_pinilla", "snowzone"] },
];

/**
 * Normalize a raw destination string into a canonical slug + product-search stations.
 * Uses case-insensitive includes() for fuzzy matching.
 */
export function normalizeDestination(raw: string): NormalizedDestination {
  const input = raw.toLowerCase().trim().replace(/_/g, " ");

  for (const rule of RULES) {
    if (input.includes(rule.match)) {
      return { slug: rule.slug, stations: rule.stations };
    }
  }

  // Fallback — use raw value as slug and single station
  const slug = raw.toLowerCase().trim().replace(/\s+/g, "_");
  return { slug, stations: [slug] };
}
