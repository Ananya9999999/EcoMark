"use client";

/**
 * Coordinate input for satellite claims — a strict funnel.
 *
 *   country → state → city → PIN code → exact point
 *
 * Each step stays disabled until the one above it is answered, and the
 * globe flies and zooms in at every level. Once a PIN code is set, clicking
 * the globe records the precise point; if the user never clicks, the PIN
 * code's own coordinates stand as the approximate location.
 *
 * The lat/lng fields below are always live, and are the complete keyboard
 * path and the fallback when WebGL or motion preferences rule the globe out.
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

import { formatLatLng, formatRadius } from "@/lib/format";
import { prefersReducedMotion } from "@/lib/capabilities";
import {
  COUNTRIES,
  lookupPostalOnline,
  ZOOM,
  type City,
  type Country,
  type Pin,
  type State,
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

/** One step of the funnel. Locked until the previous step is answered. */
function Step({
  index,
  label,
  hint,
  enabled,
  children,
}: {
  index: number;
  label: string;
  hint?: string;
  enabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={enabled ? "" : "pointer-events-none opacity-40"}>
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className={`mono-12 ${enabled ? "text-signal" : "text-muted"}`}>
          {String(index).padStart(2, "0")}
        </span>
        <label className="t-label">{label}</label>
        {hint && <span className="mono-12 text-muted">{hint}</span>}
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
  const [state, setState] = useState<State | null>(null);
  const [city, setCity] = useState<City | null>(null);
  const [pin, setPin] = useState<Pin | null>(null);
  const [pinText, setPinText] = useState("");
  const [pinStatus, setPinStatus] = useState<"idle" | "looking" | "found" | "unknown">("idle");
  const [pinnedExactly, setPinnedExactly] = useState(false);

  const latId = useId();
  const lngId = useId();
  const radiusId = useId();
  const pinId = useId();

  useEffect(() => {
    setShowGlobe(!prefersReducedMotion() && webglAvailable());
  }, []);

  const handleContextLost = useCallback(() => setShowGlobe(false), []);

  const move = (lat: number, lng: number) => onChange({ ...value, lat, lng });

  // Zoom follows how far down the funnel we are.
  const zoom = pin
    ? ZOOM.pin
    : city
      ? ZOOM.city
      : state
        ? ZOOM.state
        : country
          ? ZOOM.country
          : ZOOM.world;

  const selectCountry = (c: Country | null) => {
    setCountry(c);
    setState(null);
    setCity(null);
    setPin(null);
    setPinText("");
    setPinStatus("idle");
    setPinnedExactly(false);
    if (c) move(c.lat, c.lng);
  };

  const selectState = (s: State | null) => {
    setState(s);
    setCity(null);
    setPin(null);
    setPinText("");
    setPinStatus("idle");
    setPinnedExactly(false);
    if (s) move(s.lat, s.lng);
  };

  const selectCity = (c: City | null) => {
    setCity(c);
    setPin(null);
    setPinText("");
    setPinStatus("idle");
    setPinnedExactly(false);
    if (c) move(c.lat, c.lng);
  };

  const selectPin = (p: Pin) => {
    setPin(p);
    setPinText(p.code);
    setPinStatus("found");
    setPinnedExactly(false);
    move(p.lat, p.lng);
  };

  /** A typed code: match the bundled list, else try online, else keep the city. */
  const resolveTypedPin = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed || !city || !country) return;
    const known = city.pins.find((p) => p.code.toLowerCase() === trimmed.toLowerCase());
    if (known) {
      selectPin(known);
      return;
    }
    setPinStatus("looking");
    const hit = await lookupPostalOnline(trimmed, country.code);
    if (hit) {
      const found: Pin = { code: trimmed, lat: hit.lat, lng: hit.lng };
      setPin(found);
      setPinStatus("found");
      setPinnedExactly(false);
      move(found.lat, found.lng);
    } else {
      setPinStatus("unknown");
    }
  };

  const readout =
    value.lat == null || value.lng == null ? null : formatLatLng(value.lat, value.lng);

  const postalLabel = country?.postalLabel ?? "PIN code";

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
          setPinnedExactly(true);
        }}
        className="field mono-14 w-full"
      />
    </div>
  );

  const selectClass = "field t-14 w-full";

  return (
    <div className="flex flex-col gap-5">
      {/* ---- the funnel ---- */}
      <div className="panel flex flex-col gap-4 p-5">
        <Step index={1} label="Country" enabled>
          <select
            value={country?.code ?? ""}
            onChange={(e) =>
              selectCountry(COUNTRIES.find((c) => c.code === e.target.value) ?? null)
            }
            className={selectClass}
            aria-label="Country"
          >
            <option value="">Select a country…</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </Step>

        <Step
          index={2}
          label="State or region"
          enabled={!!country}
          hint={country ? undefined : "choose a country first"}
        >
          <select
            value={state?.name ?? ""}
            disabled={!country}
            onChange={(e) =>
              selectState(country?.states.find((s) => s.name === e.target.value) ?? null)
            }
            className={selectClass}
            aria-label="State or region"
          >
            <option value="">Select a state…</option>
            {country?.states.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </Step>

        <Step
          index={3}
          label="City or district"
          enabled={!!state}
          hint={state ? undefined : "choose a state first"}
        >
          <select
            value={city?.name ?? ""}
            disabled={!state}
            onChange={(e) =>
              selectCity(state?.cities.find((c) => c.name === e.target.value) ?? null)
            }
            className={selectClass}
            aria-label="City or district"
          >
            <option value="">Select a city…</option>
            {state?.cities.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </Step>

        <Step
          index={4}
          label={postalLabel}
          enabled={!!city}
          hint={city ? undefined : "choose a city first"}
        >
          <div className="flex flex-col gap-2">
            {city && city.pins.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {city.pins.map((p) => {
                  const on = pin?.code === p.code;
                  return (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => selectPin(p)}
                      className={`mono-12 rounded-[var(--r-instrument)] border px-2 py-1 transition-colors ${
                        on
                          ? "border-signal bg-[var(--signal-wash)] text-signal"
                          : "border-line text-secondary hover:border-signal hover:text-primary"
                      }`}
                    >
                      {p.code}
                      {p.area ? ` · ${p.area}` : ""}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2">
              <input
                id={pinId}
                type="text"
                inputMode="numeric"
                value={pinText}
                disabled={!city}
                placeholder={`Or type any ${postalLabel.toLowerCase()}`}
                onChange={(e) => {
                  setPinText(e.target.value);
                  setPinStatus("idle");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    resolveTypedPin(pinText);
                  }
                }}
                className="field mono-14 flex-1"
                aria-label={postalLabel}
              />
              <button
                type="button"
                disabled={!city || !pinText.trim()}
                onClick={() => resolveTypedPin(pinText)}
                className="field t-14 shrink-0 px-3 text-secondary transition-colors hover:border-signal hover:text-signal disabled:opacity-40"
              >
                {pinStatus === "looking" ? "Locating…" : "Locate"}
              </button>
            </div>
            {pinStatus === "unknown" && (
              <p className="mono-12 text-[var(--ember)]">
                That code isn&apos;t in the offline list and no lookup was reachable. The
                city centre is being used — drop a pin on the globe to be exact.
              </p>
            )}
          </div>
        </Step>
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
              setPinnedExactly(true);
            }}
            onContextLost={handleContextLost}
            className="h-80 w-full overflow-hidden rounded-[var(--r-panel)] border border-line bg-void md:h-96"
          />

          <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-2">
            <span className="mono-12 rounded-[var(--r-instrument)] bg-[color-mix(in_srgb,var(--bg-void)_88%,transparent)] px-2.5 py-1.5 text-signal backdrop-blur">
              {readout ?? "select a country to begin"}
            </span>
            {value.lat != null && (
              <span className="mono-12 rounded-[var(--r-instrument)] bg-[color-mix(in_srgb,var(--bg-void)_88%,transparent)] px-2.5 py-1.5 text-muted backdrop-blur">
                {pinnedExactly ? "exact point" : pin ? `approx · ${pin.code}` : "area centre"}
              </span>
            )}
          </div>

          {!country && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="t-14 rounded-[var(--r-row)] bg-[color-mix(in_srgb,var(--bg-void)_80%,transparent)] px-4 py-2 text-secondary backdrop-blur">
                Choose a country above to begin
              </span>
            </div>
          )}
        </div>
      )}

      <p className="mono-12 text-muted">
        {pin
          ? "Click the globe to mark the exact parcel, or leave it on the code's centre."
          : "Drag to rotate. Zoom follows the steps above, so the page still scrolls."}
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
