import "server-only";

export type Point = { lat: number; lng: number; label: string };

const UA = "WrenchNow/1.0 (hello@getwrenchnow.com)";

/** "39.74,-104.99" → point. Used by the "use my location" button. */
export function parseLatLng(input: string): Point | null {
  const m = input.trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng, label: "Your location" };
}

async function census(address: string): Promise<Point | null> {
  const url = new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress");
  url.searchParams.set("address", address);
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("format", "json");
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } });
  if (!res.ok) return null;
  const json = (await res.json()) as { result?: { addressMatches?: { coordinates: { x: number; y: number }; matchedAddress: string }[] } };
  const hit = json.result?.addressMatches?.[0];
  return hit ? { lat: hit.coordinates.y, lng: hit.coordinates.x, label: hit.matchedAddress } : null;
}

async function nominatim(query: string): Promise<Point | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("q", query);
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("limit", "1");
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } });
  if (!res.ok) return null;
  const json = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  const hit = json[0];
  return hit ? { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name.split(",").slice(0, 3).join(",") } : null;
}

/**
 * Address, city, or ZIP → coordinates. Street addresses go to the US Census
 * geocoder first (free, no key); anything else, or a miss, falls back to
 * OpenStreetMap Nominatim. Returns null when nothing matches or both fail.
 */
export async function geocode(input: string): Promise<Point | null> {
  const q = input.trim();
  if (!q) return null;
  const direct = parseLatLng(q);
  if (direct) return direct;
  try {
    if (/^\d+\s+\S+/.test(q)) {
      const hit = await census(q);
      if (hit) return hit;
    }
    return await nominatim(q);
  } catch {
    return null;
  }
}
