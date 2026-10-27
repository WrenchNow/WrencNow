/**
 * Colorado sales tax on parts (pure math + rate table, no I/O so it's unit-testable).
 *
 * What's taxed: parts sold with a repair (receipt price) and, by default, the parts handling
 * charge. Separately stated labor is not taxed in Colorado. WrenchNow collects the tax as the
 * marketplace facilitator and keeps it out of the mechanic's payout so it can be remitted.
 *
 * Rates are in milli-percent (thousandths of a percent): 2.9% = 2900, 1.335% = 1335.
 * Source: Colorado DOR, DR 1002 "Colorado Sales/Use Tax Rates", January 2026 (updated each Jan 1 and Jul 1).
 * Combined rates were cross-checked against city publications for places outside RTD
 * (Castle Rock, Castle Pines). Local improvement / metro districts are not modeled; addresses
 * in places where those are common are flagged for review instead.
 */

export const RATES_EFFECTIVE = "2026-01-01";
export const RATES_SOURCE = "Colorado DOR DR 1002, January 2026";

export const STATE_MPCT = 2900;
export const RTD_MPCT = 1000;
export const CD_MPCT = 100; // Scientific and Cultural Facilities District

type County = { name: string; mpct: number };
/** County-level rates for the Denver-metro service area. Denver and Broomfield collect as a city-county (rate is on the city). */
export const COUNTIES: Record<string, County> = {
  adams: { name: "Adams County", mpct: 750 },
  arapahoe: { name: "Arapahoe County", mpct: 250 },
  boulder: { name: "Boulder County", mpct: 1335 },
  broomfield: { name: "Broomfield (city & county)", mpct: 0 },
  denver: { name: "Denver (city & county)", mpct: 0 },
  douglas: { name: "Douglas County", mpct: 1000 },
  jefferson: { name: "Jefferson County", mpct: 500 },
};

type Place = { name: string; mpct: number; rtd?: boolean; cd?: boolean; review?: string };
/** City rates (DR 1002, Jan 2026). RTD and CD apply unless set to false. */
export const PLACES: Record<string, Place> = {
  arvada: { name: "Arvada", mpct: 3460 },
  aurora: { name: "Aurora", mpct: 3750 },
  boulder: { name: "Boulder", mpct: 3860 },
  brighton: { name: "Brighton", mpct: 3750 },
  broomfield: { name: "Broomfield", mpct: 4150 },
  "castle pines": { name: "Castle Pines", mpct: 3750, rtd: false },
  "castle rock": { name: "Castle Rock", mpct: 4200, rtd: false, cd: false },
  centennial: { name: "Centennial", mpct: 2500 },
  "cherry hills village": { name: "Cherry Hills Village", mpct: 3500 },
  "commerce city": { name: "Commerce City", mpct: 4500, review: "Part of Commerce City adds a 0.5% fire district tax" },
  denver: { name: "Denver", mpct: 5150 },
  edgewater: { name: "Edgewater", mpct: 3500 },
  englewood: { name: "Englewood", mpct: 3800 },
  erie: { name: "Erie", mpct: 3500, review: "Erie spans Boulder and Weld counties" },
  "federal heights": { name: "Federal Heights", mpct: 4000 },
  glendale: { name: "Glendale", mpct: 3750 },
  golden: { name: "Golden", mpct: 3000 },
  "greenwood village": { name: "Greenwood Village", mpct: 3000 },
  lafayette: { name: "Lafayette", mpct: 3870 },
  lakewood: { name: "Lakewood", mpct: 3000 },
  littleton: { name: "Littleton", mpct: 3750 },
  "lone tree": { name: "Lone Tree", mpct: 2500 },
  longmont: { name: "Longmont", mpct: 3530 },
  louisville: { name: "Louisville", mpct: 3775 },
  northglenn: { name: "Northglenn", mpct: 4000 },
  parker: { name: "Parker", mpct: 3000 },
  sheridan: { name: "Sheridan", mpct: 3500 },
  superior: { name: "Superior", mpct: 3775 },
  thornton: { name: "Thornton", mpct: 3750 },
  westminster: { name: "Westminster", mpct: 4250 },
  "wheat ridge": { name: "Wheat Ridge", mpct: 3500 },
};

/**
 * ZIPs that sit entirely inside the City and County of Denver. Used only when the address
 * can't be placed on the map; any other ZIP gets the provisional rate and an admin review flag.
 */
export const DENVER_ZIPS = new Set([
  "80202", "80203", "80204", "80205", "80206", "80207", "80209", "80210", "80211", "80218", "80220", "80238", "80249",
  "80264", "80290", "80293", "80294",
]);

export type TaxComponent = { name: string; mpct: number };
export type TaxResolution = {
  zip: string | null;
  county: string | null;
  place: string | null;
  mpct: number;
  components: TaxComponent[];
  /** "address": placed on the map. "zip": Denver-only ZIP. "provisional": couldn't place it, Denver rate pending review. */
  source: "address" | "zip" | "provisional";
  review: string | null;
};

/** Normalizes Census names: "Denver County" → "denver", "Castle Rock town" → "castle rock". */
export function normalizeName(name: string | null | undefined): string | null {
  if (!name) return null;
  const n = name
    .toLowerCase()
    .replace(/\s+(city and county|county|city|town|cdp)$/, "")
    .trim();
  return n || null;
}

/** Last 5-digit ZIP in a typed address ("123 Main St, Denver, CO 80203-1234" → "80203"). */
export function zipFromAddress(address: string): string | null {
  const all = [...address.matchAll(/\b(\d{5})(?:-\d{4})?\b/g)];
  return all.length ? all[all.length - 1][1] : null;
}

function build(zip: string | null, countyKey: string | null, placeKey: string | null, source: TaxResolution["source"], review: string | null): TaxResolution {
  const county = countyKey ? COUNTIES[countyKey] : undefined;
  const place = placeKey ? PLACES[placeKey] : undefined;
  const components: TaxComponent[] = [{ name: "Colorado", mpct: STATE_MPCT }];
  if (county && county.mpct > 0) components.push({ name: county.name, mpct: county.mpct });
  if (place) components.push({ name: `City of ${place.name}`, mpct: place.mpct });
  if (place?.rtd !== false) components.push({ name: "RTD", mpct: RTD_MPCT });
  if (place?.cd !== false) components.push({ name: "Cultural Facilities District", mpct: CD_MPCT });
  return {
    zip,
    county: county?.name ?? null,
    place: place?.name ?? null,
    mpct: components.reduce((s, c) => s + c.mpct, 0),
    components,
    source,
    review,
  };
}

/** Provisional: the launch city's rate, flagged so an admin checks it before the books are closed. */
function provisional(zip: string | null, why: string): TaxResolution {
  return build(zip, "denver", "denver", "provisional", why);
}

/**
 * Picks the rate from where the job is. `county` and `place` come from the Census geocoder
 * (raw names such as "Arapahoe County" / "Aurora city"); `place` is null outside city limits.
 * Falls back to the ZIP, then to a provisional rate flagged for review.
 */
export function resolveTax(input: { zip: string | null; state?: string | null; county?: string | null; place?: string | null; placed: boolean }): TaxResolution {
  const zip = input.zip;
  if (input.placed) {
    if (input.state && input.state !== "08") return provisional(zip, "Job address is outside Colorado");
    const countyKey = normalizeName(input.county);
    const placeKey = normalizeName(input.place);
    if (!countyKey || !COUNTIES[countyKey]) return provisional(zip, `Address is in ${input.county ?? "an unknown county"}, outside the rate table`);
    if (placeKey) {
      const place = PLACES[placeKey];
      if (!place) return provisional(zip, `City of ${input.place} isn't in the rate table`);
      return build(zip, countyKey, placeKey, "address", place.review ?? null);
    }
    // Unincorporated: county + RTD + CD. Douglas County's rural south is outside RTD, so check those.
    const review = countyKey === "douglas" ? "Unincorporated Douglas County: confirm RTD applies" : null;
    return build(zip, countyKey, null, "address", review);
  }
  if (zip && DENVER_ZIPS.has(zip)) return build(zip, "denver", "denver", "zip", null);
  return provisional(zip, zip ? `Couldn't place the address; ZIP ${zip} may span several cities` : "No ZIP code in the address");
}

/** Tax on a taxable amount, rounded to the nearest cent. */
export function salesTaxCents(taxableCents: number, mpct: number): number {
  if (taxableCents <= 0 || mpct <= 0) return 0;
  return Math.round((taxableCents * mpct) / 100000);
}

/** Parts tax: receipt price, plus the handling charge when it's treated as taxable. */
export function partsSalesTaxCents(partsCents: number, handlingCents: number, mpct: number, taxHandling: boolean): number {
  return salesTaxCents(partsCents + (taxHandling ? handlingCents : 0), mpct);
}

/** "9.15%" from 9150 milli-percent. */
export function formatRate(mpct: number): string {
  return `${(mpct / 1000).toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}%`;
}

/** Share of a refund that gives back tax, in proportion to the charge. */
export function taxShareOfRefund(refundCents: number, taxCents: number, chargedCents: number): number {
  if (refundCents <= 0 || taxCents <= 0 || chargedCents <= 0) return 0;
  return Math.min(taxCents, Math.round((refundCents * taxCents) / chargedCents));
}

/**
 * Splits a tax amount across its jurisdictions in proportion to their rates (largest remainder,
 * so the pieces always add up to the total). Used for the monthly filing report.
 */
export function allocateTax(taxCents: number, components: TaxComponent[]): { name: string; cents: number }[] {
  const total = components.reduce((s, c) => s + c.mpct, 0);
  if (taxCents === 0 || total <= 0) return components.map((c) => ({ name: c.name, cents: 0 }));
  const raw = components.map((c) => (taxCents * c.mpct) / total);
  const out = raw.map((r, i) => ({ name: components[i].name, cents: Math.trunc(r), rem: Math.abs(r - Math.trunc(r)) }));
  let left = taxCents - out.reduce((s, o) => s + o.cents, 0);
  const step = Math.sign(left);
  for (const o of [...out].sort((a, b) => b.rem - a.rem)) {
    if (left === 0) break;
    o.cents += step;
    left -= step;
  }
  return out.map(({ name, cents }) => ({ name, cents }));
}

export type TaxReportRow = { sales_tax_cents: number; sales_tax_refunded_cents: number; taxable_cents: number; components: TaxComponent[] };

/** Month totals and the per-jurisdiction split of net tax (collected minus refunded). */
export function taxReport(rows: TaxReportRow[]) {
  const byJurisdiction = new Map<string, number>();
  let collected = 0;
  let refunded = 0;
  let taxable = 0;
  for (const r of rows) {
    collected += r.sales_tax_cents;
    refunded += r.sales_tax_refunded_cents;
    taxable += r.taxable_cents;
    for (const piece of allocateTax(r.sales_tax_cents - r.sales_tax_refunded_cents, r.components)) {
      byJurisdiction.set(piece.name, (byJurisdiction.get(piece.name) ?? 0) + piece.cents);
    }
  }
  return {
    jobs: rows.length,
    taxable,
    collected,
    refunded,
    net: collected - refunded,
    jurisdictions: [...byJurisdiction.entries()].map(([name, cents]) => ({ name, cents })).sort((a, b) => b.cents - a.cents),
  };
}
