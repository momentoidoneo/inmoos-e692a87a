/**
 * Cross-portal deduplication for scraper results.
 * The same listing often appears in idealista + fotocasa + habitaclia.
 * We bucket by a fuzzy signature: title-prefix + price + surface_m2.
 */
export interface DedupeInput {
  id: string;
  title: string | null;
  price: number | null;
  surface_m2: number | null;
}

function normalizeTitle(t: string | null): string {
  if (!t) return "";
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 5)
    .join(" ");
}

export function dedupeKey(r: DedupeInput): string {
  return [normalizeTitle(r.title), r.price ?? "?", r.surface_m2 ?? "?"].join("|");
}

/**
 * Returns: items with `_duplicateOf` set to the canonical id when applicable,
 * and a count of dropped duplicates.
 */
export function buildDedupeMap<T extends DedupeInput>(items: T[]): {
  canonicalIds: Set<string>;
  duplicates: number;
} {
  const seen = new Map<string, string>();
  const canonical = new Set<string>();
  let dups = 0;
  for (const r of items) {
    const k = dedupeKey(r);
    if (!seen.has(k)) {
      seen.set(k, r.id);
      canonical.add(r.id);
    } else {
      dups++;
    }
  }
  return { canonicalIds: canonical, duplicates: dups };
}
