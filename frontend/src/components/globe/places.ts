/**
 * Location data for the picker.
 *
 * Countries and states come from the bundled dataset — 250 countries and
 * 5,305 regions, offline, no API key. Cities and postal codes are looked up
 * on demand through OpenStreetMap's keyless Nominatim service, scoped to
 * whatever the user has already chosen, with a small curated fallback so
 * the common demo path still works with no network at all.
 */

import { RAW_COUNTRIES, type RawCountry } from "./geo-data";

export interface Place {
  name: string;
  lat: number;
  lng: number;
}

export interface Region extends Place {}

export interface Country {
  code: string;
  name: string;
  lat: number;
  lng: number;
  regions: Region[];
}

function toCountry(raw: RawCountry): Country {
  return {
    code: raw[0],
    name: raw[1],
    lat: raw[2],
    lng: raw[3],
    regions: raw[4].map(([name, lat, lng]) => ({ name, lat, lng })),
  };
}

export const COUNTRIES: Country[] = RAW_COUNTRIES.map(toCountry);

export function findCountry(code: string): Country | null {
  return COUNTRIES.find((c) => c.code === code) ?? null;
}

/** What a country calls its postal code, for the field label. */
export function postalLabel(code: string): string {
  if (code === "IN") return "PIN code";
  if (code === "US") return "ZIP code";
  if (code === "BR") return "CEP";
  if (code === "GB" || code === "AU" || code === "NZ") return "Postcode";
  return "Postal code";
}

/**
 * Offline fallback cities, so the demo path works with no network.
 * Anything beyond these resolves through the online search.
 */
const OFFLINE_CITIES: Record<string, Place[]> = {
  Karnataka: [
    { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
    { name: "Mysuru", lat: 12.2958, lng: 76.6394 },
    { name: "Madikeri", lat: 12.4244, lng: 75.7382 },
  ],
  "Tamil Nadu": [
    { name: "Chennai", lat: 13.0827, lng: 80.2707 },
    { name: "Coimbatore", lat: 11.0168, lng: 76.9558 },
    { name: "Vellore", lat: 12.9165, lng: 79.1325 },
    { name: "Udhagamandalam (Ooty)", lat: 11.4102, lng: 76.695 },
  ],
  Maharashtra: [
    { name: "Mumbai", lat: 19.076, lng: 72.8777 },
    { name: "Pune", lat: 18.5204, lng: 73.8567 },
    { name: "Nagpur", lat: 21.1458, lng: 79.0882 },
  ],
  Kerala: [
    { name: "Kochi", lat: 9.9312, lng: 76.2673 },
    { name: "Thiruvananthapuram", lat: 8.5241, lng: 76.9366 },
    { name: "Kalpetta (Wayanad)", lat: 11.6087, lng: 76.083 },
  ],
  Delhi: [{ name: "New Delhi", lat: 28.6139, lng: 77.209 }],
  "West Bengal": [
    { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
    { name: "Darjeeling", lat: 27.041, lng: 88.2663 },
  ],
  Telangana: [{ name: "Hyderabad", lat: 17.385, lng: 78.4867 }],
  Rajasthan: [
    { name: "Jaipur", lat: 26.9124, lng: 75.7873 },
    { name: "Udaipur", lat: 24.5854, lng: 73.7125 },
  ],
};

/** Well-known PIN codes, offered as chips when the city has them. */
const OFFLINE_PINS: Record<string, Place[]> = {
  Bengaluru: [
    { name: "560001 · Bengaluru GPO", lat: 12.9767, lng: 77.6033 },
    { name: "560034 · Koramangala", lat: 12.9345, lng: 77.6266 },
    { name: "560066 · Whitefield", lat: 12.9698, lng: 77.7499 },
  ],
  Chennai: [
    { name: "600001 · Parrys", lat: 13.0925, lng: 80.2874 },
    { name: "600042 · Velachery", lat: 12.9755, lng: 80.2207 },
  ],
  Mumbai: [
    { name: "400001 · Fort", lat: 18.9339, lng: 72.8356 },
    { name: "400050 · Bandra West", lat: 19.0606, lng: 72.8365 },
  ],
  Vellore: [
    { name: "632001 · Vellore GPO", lat: 12.9184, lng: 79.1325 },
    { name: "632014 · Katpadi", lat: 12.9698, lng: 79.1559 },
  ],
};

export function offlineCities(regionName: string): Place[] {
  return OFFLINE_CITIES[regionName] ?? [];
}

export function offlinePins(cityName: string): Place[] {
  return OFFLINE_PINS[cityName] ?? [];
}

/** Camera distance per funnel level — smaller is closer in. */
export const ZOOM = {
  world: 3.0,
  country: 2.15,
  region: 1.78,
  city: 1.5,
  pin: 1.32,
} as const;

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

async function nominatim(params: Record<string, string>): Promise<Place[]> {
  const query = new URLSearchParams({ format: "json", limit: "6", ...params });
  try {
    const res = await fetch(`${NOMINATIM}?${query}`, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const rows = (await res.json()) as { display_name: string; lat: string; lon: string }[];
    return rows.map((r) => ({
      name: r.display_name.split(",").slice(0, 2).join(",").trim(),
      lat: Number(r.lat),
      lng: Number(r.lon),
    }));
  } catch {
    return []; // offline: the curated lists still work
  }
}

/** Search cities inside a country, biased by the chosen region. */
export function searchCities(
  query: string,
  countryCode: string,
  regionName?: string,
): Promise<Place[]> {
  if (query.trim().length < 2) return Promise.resolve([]);
  return nominatim({
    q: regionName ? `${query}, ${regionName}` : query,
    countrycodes: countryCode.toLowerCase(),
  });
}

/** Resolve a postal code within a country. */
export async function lookupPostal(
  code: string,
  countryCode: string,
): Promise<Place | null> {
  if (code.trim().length < 3) return null;
  const rows = await nominatim({
    postalcode: code.trim(),
    countrycodes: countryCode.toLowerCase(),
    limit: "1",
  });
  return rows[0] ?? null;
}
