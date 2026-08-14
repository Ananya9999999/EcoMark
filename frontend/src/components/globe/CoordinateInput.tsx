"use client";

/**
 * Coordinate input for satellite claims — a funnel laid out in two rows.
 *
 *   country → state → city → PIN code → exact point
 *
 * Each step stays disabled until the one above is answered, and the globe
 * flies and zooms in at every level. With a PIN code set, clicking the
 * globe records the precise point; without a click the code's own
 * coordinates stand as the approximate location.
 *
 * Countries and states are bundled offline. Cities and postal codes resolve
 * through a keyless OpenStreetMap lookup, with curated fallbacks so the
 * common path still works with no network.
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { formatLatLng, formatRadius } from "@/lib/format";
import { prefersReducedMotion } from "@/lib/capabilities";
import {
  COUNTRIES,
  findCountry,
  lookupPostal,
  offlineCities,
  offlinePins,
  postalLabel,
  searchCities,
  ZOOM,
  type Country,
  type Place,
  type Region,
} from "./places";

const Globe = dynamic(() => import("./Globe"), { ssr: false });

export interface Coordinates {
  lat: number | null;
  lng: number | null;
  radius_m: number;
}

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function Field({
  step,
  label,
  enabled,
  children,
}: {
  step: number;
  label: string;
  enabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${enabled ? "" : "opacity-40"}`}>
      <div className="flex items-baseline gap-1.5">
        <span className={`mono-12 ${enabled ? "text-signal" : "text-muted"}`}>
          {String(step).padStart(2, "0")}
        </span>
        <span className="t-label">{label}</span>
      </div>
      {children}
    </div>
  );
}

export function CoordinateInput({
  value,
  onChange,
}: {
  value: Coordinates;
  onChange: (next: Coordinates) => void;
}) {
  const [showGlobe, setShowGlobe] = useState<boolean | null>(null);
  const [country, setCountry] = useState<Country | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [city, setCity] = useState<Place | null>(null);
  const [cityQuery, setCityQuery] = useState("");
  const [cityHits, setCityHits] = useState<Place[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const [pinText, setPinText] = useState("");
  const [pin, setPin] = useState<Place | null>(null);
  const [pinStatus, setPinStatus] = useState<"idle" | "looking" | "unknown">("idle");
  const [exact, setExact] = useState(false);

  const latId = useId();
  const lngId = useId();
  const radiusId = useId();
  const cityId = useId();
  const pinId = useId();
  const cityBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowGlobe(!prefersReducedMotion() && webglAvailable());
  }, []);

  const handleContextLost = useCallback(() => setShowGlobe(false), []);
  const move = (lat: number, lng: number) => onChange({ ...value, lat, lng });

  const zoom = pin
    ? ZOOM.pin
    : city
      ? ZOOM.city
      : region
        ? ZOOM.region
        : country
          ? ZOOM.country
          : ZOOM.world;

  // close the city suggestions on an outside click
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (cityBox.current && !cityBox.current.contains(e.target as Node)) setCityHits([]);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // debounced city search, offline list first
  useEffect(() => {
    if (!country || cityQuery.trim().length < 2) {
      setCityHits([]);
      return;
    }
    const local = offlineCities(region?.name ?? "").filter((c) =>
      c.name.toLowerCase().includes(cityQuery.trim().toLowerCase()),
    );
    setCityHits(local);
    let cancelled = false;
    setCitySearching(true);
    const t = window.setTimeout(async () => {
      const remote = await searchCities(cityQuery, country.code, region?.name);
      if (cancelled) return;
      const seen = new Set(local.map((c) => c.name.toLowerCase()));
      setCityHits([...local, ...remote.filter((r) => !seen.has(r.name.toLowerCase()))]);
      setCitySearching(false);
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      setCitySearching(false);
    };
  }, [cityQuery, country, region]);

  const pickCountry = (code: string) => {
    const c = findCountry(code);
    setCountry(c);
    setRegion(null);
    setCity(null);
    setCityQuery("");
    setPin(null);
    setPinText("");
    setPinStatus("idle");
    setExact(false);
    if (c) move(c.lat, c.lng);
  };

  const pickRegion = (name: string) => {
    const r = country?.regions.find((x) => x.name === name) ?? null;
    setRegion(r);
    setCity(null);
    setCityQuery("");
    setPin(null);
    setPinText("");
    setPinStatus("idle");
    setExact(false);
    if (r) move(r.lat, r.lng);
  };

  const pickCity = (p: Place) => {
    setCity(p);
    setCityQuery(p.name);
    setCityHits([]);
    setPin(null);
    setPinText("");
    setPinStatus("idle");
    setExact(false);
    move(p.lat, p.lng);
  };

  const pickPin = (p: Place) => {
    setPin(p);
    setPinText(p.name.split(" ·")[0]);
    setPinStatus("idle");
    setExact(false);
    move(p.lat, p.lng);
  };

  const resolvePin = async () => {
    if (!country || !pinText.trim()) return;
    setPinStatus("looking");
    const hit = await lookupPostal(pinText, country.code);
    if (hit) {
      setPin(hit);
      setPinStatus("idle");
      setExact(false);
      move(hit.lat, hit.lng);
    } else {
      setPinStatus("unknown");
    }
  };

  const readout =
    value.lat == null || value.lng == null ? null : formatLatLng(value.lat, value.lng);
  const label = postalLabel(country?.code ?? "");
  const pinChips = city ? offlinePins(city.name.split(" (")[0]) : [];
  const selectClass = "field t-14 w-full";

  const numberField = (
    id: string,
    text: string,
    field: "lat" | "lng",
    min: number,
    max: number,
  ) => (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="t-label">
        {text}
      </label>
      <input
        id={id}
        type="number"
        step="0.0001"
        min={min}
        max={max}
        value={value[field] ?? ""}
        placeholder="0.0000"
        onChange={(e) => {
          const raw = e.target.value;
          onChange({ ...value, [field]: raw === "" ? null : Number(raw) });
          setExact(true);
        }}
        className="field mono-14 w-full"
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* ---- the funnel: two rows, four steps ---- */}
      <div className="panel grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Field step={1} label="Country" enabled>
          <select
            value={country?.code ?? ""}
            onChange={(e) => pickCountry(e.target.value)}
            className={selectClass}
            aria-label="Country"
          >
            <option value="">Select…</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field step={2} label="State or region" enabled={!!country}>
          <select
            value={region?.name ?? ""}
            disabled={!country}
            onChange={(e) => pickRegion(e.target.value)}
            className={selectClass}
            aria-label="State or region"
          >
            <option value="">{country ? "Select…" : "Country first"}</option>
            {country?.regions.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>

        <Field step={3} label="City or district" enabled={!!region}>
          <div ref={cityBox} className="relative">
            <input
              id={cityId}
              type="text"
              value={cityQuery}
              disabled={!region}
              placeholder={region ? "Type to search…" : "State first"}
              onChange={(e) => {
                setCityQuery(e.target.value);
                setCity(null);
              }}
              autoComplete="off"
              className="field t-14 w-full"
              aria-label="City or district"
            />
            {cityHits.length > 0 && (
              <ul
                role="listbox"
                aria-label="Matching cities"
                className="panel-elevated absolute left-0 right-0 top-full z-30 mt-1 max-h-52 overflow-auto py-1"
              >
                {cityHits.map((c) => (
                  <li key={`${c.name}-${c.lat}`}>
                    <button
                      type="button"
                      onClick={() => pickCity(c)}
                      className="t-14 w-full px-3 py-2 text-left text-primary transition-colors hover:bg-[var(--signal-wash)]"
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {citySearching && cityHits.length === 0 && (
              <span className="mono-12 absolute right-2 top-2.5 text-muted">…</span>
            )}
          </div>
        </Field>

        <Field step={4} label={label} enabled={!!city}>
          <div className="flex gap-2">
            <input
              id={pinId}
              type="text"
              inputMode="numeric"
              value={pinText}
              disabled={!city}
              placeholder={city ? "e.g. 560034" : "City first"}
              onChange={(e) => {
                setPinText(e.target.value);
                setPinStatus("idle");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  resolvePin();
                }
              }}
              className="field mono-14 min-w-0 flex-1"
              aria-label={label}
            />
            <button
              type="button"
              disabled={!city || !pinText.trim()}
              onClick={resolvePin}
              className="field t-14 shrink-0 px-2.5 text-secondary transition-colors hover:border-signal hover:text-signal disabled:opacity-40"
            >
              {pinStatus === "looking" ? "…" : "Go"}
            </button>
          </div>
        </Field>

        {/* known codes for the chosen city */}
        {pinChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:col-span-2 lg:col-span-4">
            {pinChips.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => pickPin(p)}
                className={`mono-12 rounded-[var(--r-instrument)] border px-2 py-1 transition-colors ${
                  pin?.name === p.name
                    ? "border-signal bg-[var(--signal-wash)] text-signal"
                    : "border-line text-secondary hover:border-signal hover:text-primary"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
        {pinStatus === "unknown" && (
          <p className="mono-12 text-[var(--ember)] sm:col-span-2 lg:col-span-4">
            No match for that code. The city centre is being used — click the globe to
            set the exact parcel.
          </p>
        )}
      </div>

      {/* ---- the globe ---- */}
      {showGlobe && (
        <div className="relative">
          <Globe
            lat={value.lat}
            lng={value.lng}
            radiusM={value.radius_m}
            interactive
            zoom={zoom}
            onPick={(lat, lng) => {
              move(lat, lng);
              setExact(true);
            }}
            onContextLost={handleContextLost}
            className="h-80 w-full overflow-hidden rounded-[var(--r-panel)] border border-line bg-void md:h-96"
          />
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap gap-2">
            <span className="mono-12 rounded-[var(--r-instrument)] bg-[color-mix(in_srgb,var(--bg-void)_88%,transparent)] px-2.5 py-1.5 text-signal backdrop-blur">
              {readout ?? "choose a country to begin"}
            </span>
            {value.lat != null && (
              <span className="mono-12 rounded-[var(--r-instrument)] bg-[color-mix(in_srgb,var(--bg-void)_88%,transparent)] px-2.5 py-1.5 text-muted backdrop-blur">
                {exact ? "exact point" : pin ? "approx · postal centre" : "area centre"}
              </span>
            )}
          </div>
        </div>
      )}

      <p className="mono-12 text-muted">
        Drag to rotate. Zoom follows the steps above, so the page still scrolls.
        {city ? " Click the globe to mark the exact parcel." : ""}
      </p>

      {/* ---- always-live coordinates ---- */}
      <div className="grid grid-cols-2 gap-4">
        {numberField(latId, "Latitude", "lat", -90, 90)}
        {numberField(lngId, "Longitude", "lng", -180, 180)}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor={radiusId} className="t-label">
            Claim radius
          </label>
          <span className="mono-14 text-primary">{formatRadius(value.radius_m)}</span>
        </div>
        <input
          id={radiusId}
          type="range"
          min={50}
          max={5000}
          step={50}
          value={value.radius_m}
          onChange={(e) => onChange({ ...value, radius_m: Number(e.target.value) })}
          className="accent-signal"
        />
        <div className="mono-12 flex justify-between text-muted">
          <span>50 m</span>
          <span>5 km</span>
        </div>
      </div>
    </div>
  );
}
