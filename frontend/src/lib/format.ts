/** Formatting helpers — measured values get consistent treatment. */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function parse(iso: string): Date {
  // A date-only string must stay the calendar date the user picked:
  // new Date("2026-08-14") is UTC midnight and shifts a day in UTC-negative
  // timezones, so parse it as local time instead.
  return new Date(DATE_ONLY.test(iso) ? `${iso}T00:00:00` : iso);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso || !ISO_DATE.test(iso)) return iso ?? "—";
  const d = parse(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso || !ISO_DATE.test(iso)) return iso ?? "—";
  const d = parse(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 12.9716° N, 77.5946° E */
export function formatLatLng(lat: number, lng: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${ns}, ${Math.abs(lng).toFixed(4)}° ${ew}`;
}

export function formatRadius(radiusM: number): string {
  return radiusM >= 1000 ? `${(radiusM / 1000).toFixed(1)} km` : `${radiusM} m`;
}

/** Shorten a transaction hash for display. */
export function shortHash(hash: string): string {
  return hash.length > 14 ? `${hash.slice(0, 8)}…${hash.slice(-4)}` : hash;
}

/** ndvi_before -> "NDVI before"; units_kwh -> "Units kWh" */
export function humaniseKey(key: string): string {
  const SPECIAL: Record<string, string> = {
    ndvi: "NDVI",
    evi: "EVI",
    savi: "SAVI",
    kwh: "kWh",
    kl: "kL",
    co2: "CO₂",
    kg: "kg",
    km: "km",
    m: "m",
    pct: "%",
    inr: "INR",
    url: "URL",
    id: "ID",
    gps: "GPS",
    ev: "EV",
  };
  const words = key.split(/[_\s]+/).filter(Boolean);
  return words
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (SPECIAL[lower]) return SPECIAL[lower];
      if (i === 0) return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      return lower;
    })
    .join(" ");
}

/** Numbers to sensible precision; dates readably; everything else as text. */
export function formatEvidenceValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "number") {
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toFixed(Math.abs(value) < 1 ? 2 : Math.abs(value) < 100 ? 1 : 0);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(value)) return formatDate(value);
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
