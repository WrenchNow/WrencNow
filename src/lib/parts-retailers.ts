// Parts-store "price check" links for mechanics. Each link goes through /go/parts/<store> so WrenchNow can count
// clicks and, once approved for a store's affiliate program, add its tracking (env PARTS_AFFILIATE_<STORE>).
// Pure — safe in client and server code (env is read only on the server, in partsRetailerUrl's callers).

export const PARTS_RETAILERS = [
  { key: "autozone", name: "AutoZone", search: "https://www.autozone.com/searchresult?searchText={q}" },
  { key: "oreilly", name: "O'Reilly", search: "https://www.oreillyauto.com/search?q={q}" },
  { key: "advance", name: "Advance", search: "https://shop.advanceautoparts.com/web/SearchResults?searchTerm={q}" },
  { key: "napa", name: "NAPA", search: "https://www.napaonline.com/search?text={q}" },
] as const;

export type RetailerKey = (typeof PARTS_RETAILERS)[number]["key"];

export function isRetailer(key: string): key is RetailerKey {
  return PARTS_RETAILERS.some((r) => r.key === key);
}

/**
 * Destination for a price check. `searchOverride` replaces the store's search URL ({q} = encoded query);
 * `affiliateTemplate` wraps it ({url} = encoded destination, {q} = encoded query), e.g. a network deep link.
 */
export function partsRetailerUrl(key: RetailerKey, query: string, opts: { searchOverride?: string; affiliateTemplate?: string } = {}): string {
  const r = PARTS_RETAILERS.find((x) => x.key === key)!;
  const q = encodeURIComponent(query.trim().replace(/\s+/g, " ").slice(0, 120));
  const dest = (opts.searchOverride || r.search).replaceAll("{q}", q);
  if (!opts.affiliateTemplate) return dest;
  return opts.affiliateTemplate.replaceAll("{url}", encodeURIComponent(dest)).replaceAll("{q}", q);
}

/** Search text for a part on a given car: "Front brake pads 2015 Honda Civic". */
export function partsQuery(partName: string, vehicle?: string | null) {
  return [partName, vehicle].filter(Boolean).join(" ");
}
