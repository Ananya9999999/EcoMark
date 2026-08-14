"use client";

/**
 * The coordinate form control. Emits { lat, lng, radius_m } to the parent.
 *
 * The globe is the primary input; the numeric fields beneath it are the
 * keyboard path and the required fallback — when WebGL is unavailable or
 * prefers-reduced-motion is set, only the fields render. Both paths produce
 * the identical output shape.
 */

import dynamic from "next/dynamic";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { formatRadius } from "@/lib/format";
import { searchPlaces, type Place } from "./gazetteer";

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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const latId = useId();
  const lngId = useId();
  const radiusId = useId();
  const searchId = useId();

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setShowGlobe(!reduced && webglAvailable());
  }, []);

  useEffect(() => {
    setResults(searchPlaces(query));
  }, [query]);

  // Close search results on outside click.
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setResults([]);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const readout = useMemo(() => {
    if (value.lat == null || value.lng == null) return null;
    const ns = value.lat >= 0 ? "N" : "S";
    const ew = value.lng >= 0 ? "E" : "W";
    return `${Math.abs(value.lat).toFixed(4)}° ${ns}   ${Math.abs(value.lng).toFixed(4)}° ${ew}`;
  }, [value.lat, value.lng]);

  const pick = (lat: number, lng: number) => onChange({ ...value, lat, lng });

  const numberField = (
    id: string,
    label: string,
    field: "lat" | "lng",
    min: number,
    max: number,
  ) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="type-label-xs">
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
        className="type-mono-m w-full rounded-[var(--radius-instrument)] border border-[var(--rule-strong)] bg-shelf px-2.5 py-1.5 text-airglow"
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {showGlobe && (
        <div className="relative">
          <div ref={searchRef} className="absolute left-3 top-3 z-10 w-56">
            <label htmlFor={searchId} className="sr-only">
              Search for a place
            </label>
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Jump to a place…"
              autoComplete="off"
              className="w-full rounded-[var(--radius-row)] border border-[var(--rule-strong)] bg-night-ocean/85 px-3 py-1.5 text-sm text-airglow backdrop-blur placeholder:text-graticule"
            />
            {results.length > 0 && (
              <ul
                role="listbox"
                aria-label="Matching places"
                className="surface-terrace mt-1 overflow-hidden rounded-[var(--radius-row)] py-1"
              >
                {results.map((p) => (
                  <li key={p.name}>
                    <button
                      type="button"
                      onClick={() => {
                        pick(p.lat, p.lng);
                        setQuery("");
                        setResults([]);
                      }}
                      className="w-full px-3 py-1.5 text-left text-sm text-airglow hover:bg-[var(--limb-dim)]"
                    >
                      {p.name}
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
            className="h-80 w-full overflow-hidden rounded-[var(--radius-panel)] border border-[var(--rule)] bg-night-ocean md:h-96"
          />
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-[var(--radius-instrument)] bg-night-ocean/85 px-2.5 py-1 backdrop-blur">
            <span className="type-mono-s whitespace-pre text-limb">
              {readout ?? "click the globe to drop a pin"}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {numberField(latId, "Latitude", "lat", -90, 90)}
        {numberField(lngId, "Longitude", "lng", -180, 180)}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label htmlFor={radiusId} className="type-label-xs">
            Claim radius
          </label>
          <span className="type-mono-s text-airglow">{formatRadius(value.radius_m)}</span>
        </div>
        <input
          id={radiusId}
          type="range"
          min={50}
          max={50000}
          step={50}
          value={value.radius_m}
          onChange={(e) => onChange({ ...value, radius_m: Number(e.target.value) })}
          className="accent-[var(--limb)]"
        />
        <div className="flex justify-between text-[0.65rem] text-graticule">
          <span>50 m</span>
          <span>50 km</span>
        </div>
      </div>
    </div>
  );
}
