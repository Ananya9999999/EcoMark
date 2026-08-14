"use client";

/**
 * Coordinate input for satellite claims. Emits { lat, lng, radius_m }.
 *
 * Picking a point on a bare globe is guesswork, so the control narrows in
 * steps: country → region → place → exact point. Each step flies the globe
 * to the selection; the pin can then be dragged or clicked anywhere, and
 * typed search or plain number entry reach the same result.
 *
 * The globe is the primary input; the numeric fields are the keyboard path
 * and the required fallback when WebGL or motion preferences rule it out.
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { formatLatLng, formatRadius } from "@/lib/format";
import { prefersReducedMotion } from "@/lib/capabilities";
import {
  COUNTRIES,
  searchEverything,
  searchOnline,
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
  const [query, setQuery] = useState("");
  const [onlineHits, setOnlineHits] = useState<Place[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const latId = useId();
  const lngId = useId();
  const radiusId = useId();
  const searchId = useId();

  useEffect(() => {
    setShowGlobe(!prefersReducedMotion() && webglAvailable());
  }, []);

  const handleContextLost = useCallback(() => setShowGlobe(false), []);

  const localHits = useMemo(
    () => (dismissed ? [] : searchEverything(query)),
    [query, dismissed],
  );

  // Online lookup layers on top, debounced, and never blocks the offline path.
  useEffect(() => {
    if (dismissed || query.trim().length < 3) {
      setOnlineHits([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(async () => {
      const rows = await searchOnline(query);
      if (!cancelled) setOnlineHits(rows);
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, dismissed]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDismissed(true);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (lat: number, lng: number) => onChange({ ...value, lat, lng });

  const readout =
    value.lat == null || value.lng == null ? null : formatLatLng(value.lat, value.lng);

  const numberField = (
    id: string,
    label: string,
    field: "lat" | "lng",
    min: number,
    max: number,
  ) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="t-label">
        {label}
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
        }}
        className="field mono-14 w-full"
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Step cascade — each level narrows the next */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="t-label">Area</span>
          <nav aria-label="Location breadcrumb" className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setCountry(null);
                setRegion(null);
              }}
              className={`mono-12 rounded-[var(--r-instrument)] border px-2 py-1 transition-colors ${
                country
                  ? "border-line text-secondary hover:text-primary"
                  : "border-signal bg-[var(--signal-wash)] text-signal"
              }`}
            >
              World
            </button>
            {country && (
              <>
                <span aria-hidden className="mono-12 text-muted">
                  ›
                </span>
                <button
                  type="button"
                  onClick={() => setRegion(null)}
                  className={`mono-12 rounded-[var(--r-instrument)] border px-2 py-1 transition-colors ${
                    region
                      ? "border-line text-secondary hover:text-primary"
                      : "border-signal bg-[var(--signal-wash)] text-signal"
                  }`}
                >
                  {country.name}
                </button>
              </>
            )}
            {region && (
              <>
                <span aria-hidden className="mono-12 text-muted">
                  ›
                </span>
                <span className="mono-12 rounded-[var(--r-instrument)] border border-signal bg-[var(--signal-wash)] px-2 py-1 text-signal">
                  {region.name}
                </span>
              </>
            )}
          </nav>
        </div>

        {/* the options at the current level */}
        <div className="flex flex-wrap gap-1.5">
          {!country &&
            COUNTRIES.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  setCountry(c);
                  pick(c.lat, c.lng);
                }}
                className="t-12 rounded-[var(--r-instrument)] border border-line px-2.5 py-1.5 text-secondary transition-colors hover:border-signal hover:text-primary"
              >
                {c.name}
              </button>
            ))}
          {country &&
            !region &&
            country.regions.map((r) => (
              <button
                key={r.name}
                type="button"
                onClick={() => {
                  setRegion(r);
                  pick(r.lat, r.lng);
                }}
                className="t-12 rounded-[var(--r-instrument)] border border-line px-2.5 py-1.5 text-secondary transition-colors hover:border-signal hover:text-primary"
              >
                {r.name}
              </button>
            ))}
          {region &&
            region.places.map((p) => {
              const on = value.lat === p.lat && value.lng === p.lng;
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => pick(p.lat, p.lng)}
                  className={`t-12 rounded-[var(--r-instrument)] border px-2.5 py-1.5 transition-colors ${
                    on
                      ? "border-signal bg-[var(--signal-wash)] text-signal"
                      : "border-line text-secondary hover:border-signal hover:text-primary"
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
        </div>
        {region && (
          <p className="mono-12 text-muted">
            Pick a place, then click the globe to set the exact parcel.
          </p>
        )}
      </div>

      {showGlobe && (
        <div className="relative">
          <div ref={searchRef} className="absolute left-3 top-3 z-10 w-64">
            <label htmlFor={searchId} className="sr-only">
              Search for a place
            </label>
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setDismissed(false);
              }}
              placeholder="Search any place…"
              autoComplete="off"
              className="field t-14 w-full bg-[color-mix(in_srgb,var(--bg-void)_85%,transparent)] backdrop-blur"
            />
            {(localHits.length > 0 || onlineHits.length > 0) && (
              <ul
                role="listbox"
                aria-label="Matching places"
                className="panel-elevated mt-1 max-h-60 overflow-auto py-1"
              >
                {localHits.map((h) => (
                  <li key={`l-${h.label}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setCountry(h.country);
                        setRegion(h.region ?? null);
                        pick(h.lat, h.lng);
                        setQuery("");
                      }}
                      className="t-14 w-full px-3 py-2 text-left text-primary transition-colors hover:bg-[var(--signal-wash)]"
                    >
                      {h.label}
                    </button>
                  </li>
                ))}
                {onlineHits.map((h) => (
                  <li key={`o-${h.name}`}>
                    <button
                      type="button"
                      onClick={() => {
                        pick(Number(h.lat.toFixed(4)), Number(h.lng.toFixed(4)));
                        setQuery("");
                      }}
                      className="w-full px-3 py-2 text-left transition-colors hover:bg-[var(--signal-wash)]"
                    >
                      <span className="t-14 line-clamp-1 text-secondary">{h.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Globe
            lat={value.lat}
            lng={value.lng}
            radiusM={value.radius_m}
            interactive
            onPick={pick}
            onContextLost={handleContextLost}
            className="h-80 w-full overflow-hidden rounded-[var(--r-panel)] border border-line bg-void md:h-96"
          />

          <div className="pointer-events-none absolute bottom-3 left-3 rounded-[var(--r-instrument)] bg-[color-mix(in_srgb,var(--bg-void)_85%,transparent)] px-2.5 py-1.5 backdrop-blur">
            <span className="mono-12 text-signal">
              {readout ?? "click the globe to drop a pin"}
            </span>
          </div>
        </div>
      )}

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
