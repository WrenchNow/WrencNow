import "server-only";
import { CONTACT_EMAIL } from "@/lib/contact";
import { resolveTax, zipFromAddress, type TaxResolution } from "@/lib/sales-tax";

const UA = `WrenchNow/1.0 (${CONTACT_EMAIL})`;
const BASE = "https://geocoding.geo.census.gov/geocoder/geographies";

type Geo = { NAME?: string; STATE?: string };
type CensusGeographies = { Counties?: Geo[]; "Incorporated Places"?: Geo[] };

function pick(g: CensusGeographies | undefined) {
  if (!g) return null;
  const county = g.Counties?.[0];
  if (!county) return null;
  return { state: county.STATE ?? null, county: county.NAME ?? null, place: g["Incorporated Places"]?.[0]?.NAME ?? null };
}

async function census(url: URL) {
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("vintage", "Current_Current");
  url.searchParams.set("layers", "all");
  url.searchParams.set("format", "json");
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } });
  if (!res.ok) return null;
  return res.json();
}

/** County and city for a point on the map (US Census, free, no key). */
async function byPoint(lat: number, lng: number) {
  const url = new URL(`${BASE}/coordinates`);
  url.searchParams.set("x", String(lng));
  url.searchParams.set("y", String(lat));
  const json = (await census(url)) as { result?: { geographies?: CensusGeographies } } | null;
  return pick(json?.result?.geographies);
}

/** County, city and ZIP for a typed street address. */
async function byAddress(address: string) {
  const url = new URL(`${BASE}/onelineaddress`);
  url.searchParams.set("address", address);
  const json = (await census(url)) as { result?: { addressMatches?: { geographies?: CensusGeographies; addressComponents?: { zip?: string } }[] } } | null;
  const hit = json?.result?.addressMatches?.[0];
  const where = pick(hit?.geographies);
  return where ? { ...where, zip: hit?.addressComponents?.zip ?? null } : null;
}

/**
 * Sales tax jurisdiction for a job. Uses the exact city limits when the address (or the
 * pinned location) can be placed, else the ZIP. Never throws: a lookup failure gives the
 * provisional rate with a review flag, so booking never breaks on a geocoder outage.
 */
export async function lookupTax(address: string, lat: number | null, lng: number | null): Promise<TaxResolution> {
  let zip = zipFromAddress(address);
  if (process.env.SALES_TAX_GEO_LOOKUP !== "off") {
    try {
      if (/^\d+\s+\S+/.test(address.trim())) {
        const hit = await byAddress(address);
        if (hit) return resolveTax({ zip: hit.zip ?? zip, state: hit.state, county: hit.county, place: hit.place, placed: true });
      }
      if (lat !== null && lng !== null) {
        const hit = await byPoint(lat, lng);
        if (hit) return resolveTax({ zip, state: hit.state, county: hit.county, place: hit.place, placed: true });
      }
    } catch {
      // fall through to the ZIP
    }
  }
  zip = zip ?? null;
  return resolveTax({ zip, placed: false });
}
