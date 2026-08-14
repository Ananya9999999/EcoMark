"use client";

/**
 * Log an action. One flow, but step 2 genuinely differs by verification
 * method — a location cascade for satellite claims, a document drop that
 * names the fields it will read for OCR, a trip-log drop for GPS. The five
 * upload actions are not interchangeable and should not look it.
 */

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";

import { createClaimFile, createClaimJson, messageFrom } from "@/lib/api";
import { useSessionGuard } from "@/lib/useSessionGuard";
import {
  ACTION_LABELS,
  ACTION_METHODS,
  type ActionType,
  type CreditCategory,
} from "@/lib/types";
import { Button } from "@/components/primitives/Button";
import { ACCEPT_BY_METHOD, FileDropZone } from "@/components/primitives/FileDropZone";
import { CoordinateInput, type Coordinates } from "@/components/globe/CoordinateInput";
import { CATEGORY_COLOR } from "@/components/primitives/CategoryDot";

type SelectableAction = Exclude<ActionType, "fail_test">;

/** What each action needs, and what the pipeline reads off it. */
const ACTION_SPEC: Record<
  SelectableAction,
  { category: CreditCategory; blurb: string; prompt: string; reads: string[] }
> = {
  tree_planting: {
    category: "land",
    blurb: "Verified from orbit by comparing vegetation before and after.",
    prompt: "",
    reads: [],
  },
  solar_install: {
    category: "energy",
    blurb: "Verified from your installation invoice.",
    prompt: "Drop the solar invoice",
    reads: ["vendor", "invoice date", "system size", "amount"],
  },
  ev_purchase: {
    category: "transport",
    blurb: "Verified from the vehicle purchase invoice.",
    prompt: "Drop the vehicle invoice",
    reads: ["dealer", "purchase date", "model", "amount"],
  },
  energy_reduction: {
    category: "energy",
    blurb: "Verified by comparing this bill against your previous period.",
    prompt: "Drop the electricity bill",
    reads: ["provider", "billing period", "units kWh", "previous kWh"],
  },
  water_reduction: {
    category: "water",
    blurb: "Verified by comparing this bill against your previous period.",
    prompt: "Drop the water bill",
    reads: ["provider", "billing period", "units kL", "previous kL"],
  },
  commute: {
    category: "transport",
    blurb: "Verified from your trip log by matching low-carbon routes.",
    prompt: "Drop the trip log",
    reads: ["distance", "trips", "mode", "route match"],
  },
};

const ACTIONS = Object.keys(ACTION_LABELS) as SelectableAction[];

export default function NewClaimPage() {
  const ready = useSessionGuard();
  const router = useRouter();
  const [action, setAction] = useState<SelectableAction | null>(null);
  const [coords, setCoords] = useState<Coordinates>({ lat: null, lng: null, radius_m: 500 });
  const [beforeDate, setBeforeDate] = useState("");
  const [afterDate, setAfterDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const method = action ? ACTION_METHODS[action] : null;
  const spec = action ? ACTION_SPEC[action] : null;

  const validationError = useMemo((): string | null => {
    if (!action || !method) return null;
    if (method === "satellite") {
      const { lat, lng, radius_m } = coords;
      if (lat == null || lng == null || !beforeDate || !afterDate) {
        return "Pick a location on the globe and set both dates.";
      }
      if (lat < -90 || lat > 90) return "Latitude must be between -90 and 90.";
      if (lng < -180 || lng > 180) return "Longitude must be between -180 and 180.";
      if (radius_m < 50 || radius_m > 5000) return "Radius must be between 50 m and 5 km.";
      if (!(beforeDate < afterDate)) return "The before date must come first.";
      return null;
    }
    if (!file) return "This claim needs a file.";
    return null;
  }, [action, method, coords, beforeDate, afterDate, file]);

  const submit = async () => {
    if (!action || !method) return;
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const created =
        method === "satellite"
          ? await createClaimJson({
              action_type: action,
              method,
              lat: coords.lat,
              lng: coords.lng,
              radius_m: coords.radius_m,
              before_date: beforeDate,
              after_date: afterDate,
            })
          : await createClaimFile(action, method, file!);
      router.push(`/claims/${created.claim_id}`);
    } catch (e) {
      setError(messageFrom(e, "The claim could not be submitted"));
      setSubmitting(false);
    }
  };

  if (!ready) return null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <span className="t-label">New record</span>
        <h1 className="t-40 mt-2 text-primary">Log an action</h1>
        <p className="t-14 mt-2 text-secondary">
          Choose what you did. The verification method follows from the action.
        </p>
      </header>

      {/* Step 1 — the action */}
      <section aria-label="Choose the action">
        <div className="mb-3 flex items-baseline gap-3">
          <span className="mono-12 text-signal">01</span>
          <span className="t-label">The action</span>
        </div>
        <div
          role="radiogroup"
          aria-label="Action type"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
        >
          {ACTIONS.map((a) => {
            const active = action === a;
            const s = ACTION_SPEC[a];
            return (
              <button
                key={a}
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setAction(a);
                  setError(null);
                  setFile(null);
                }}
                className={`flex flex-col gap-2 rounded-[var(--r-row)] border p-4 text-left transition-all duration-[var(--d-quick)] ${
                  active
                    ? "border-signal bg-[var(--signal-wash)]"
                    : "border-line bg-surface hover:-translate-y-px hover:border-signal-dim"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 shrink-0"
                    style={{ background: CATEGORY_COLOR[s.category] }}
                  />
                  <span className="mono-12 text-muted">{ACTION_METHODS[a]}</span>
                </span>
                <span className={`t-16 ${active ? "text-primary" : "text-secondary"}`}>
                  {ACTION_LABELS[a]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 2 — evidence, shaped by the method */}
      {action && method && spec && (
        <motion.section
          key={action}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          aria-label="Evidence"
          className="flex flex-col gap-4"
        >
          <div className="flex items-baseline gap-3">
            <span className="mono-12 text-signal">02</span>
            <div>
              <span className="t-label">The evidence</span>
              <p className="t-14 mt-1 text-secondary">{spec.blurb}</p>
            </div>
          </div>

          {method === "satellite" ? (
            <>
              <CoordinateInput value={coords} onChange={setCoords} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="before-date" className="t-label">
                    Before
                  </label>
                  <input
                    id="before-date"
                    type="date"
                    value={beforeDate}
                    onChange={(e) => setBeforeDate(e.target.value)}
                    className="field mono-14 [color-scheme:dark]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="after-date" className="t-label">
                    After
                  </label>
                  <input
                    id="after-date"
                    type="date"
                    value={afterDate}
                    onChange={(e) => setAfterDate(e.target.value)}
                    className="field mono-14 [color-scheme:dark]"
                  />
                </div>
              </div>
            </>
          ) : (
            <FileDropZone
              file={file}
              accept={ACCEPT_BY_METHOD[method]}
              hint={spec.prompt}
              reads={spec.reads}
              onChange={setFile}
              onError={setError}
            />
          )}
        </motion.section>
      )}

      {/* Step 3 — submit */}
      {action && (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline gap-3">
            <span className="mono-12 text-signal">03</span>
            <span className="t-label">Submit</span>
          </div>
          {error && (
            <p role="alert" className="t-14 shake text-[var(--alert)]">
              {error}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit claim"}
            </Button>
            {validationError && !error && (
              <span className="mono-12 text-muted">{validationError}</span>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
