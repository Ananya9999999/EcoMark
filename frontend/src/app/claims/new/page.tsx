"use client";

/**
 * New claim (8.3): choose the action, provide the evidence, submit.
 * Client-side validation uses the exact messages from 5.1. On success the
 * router moves to the claim detail page, where the verification wait plays.
 */

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";

import { ApiError, createClaimFile, createClaimJson } from "@/lib/api";
import {
  ACTION_LABELS,
  ACTION_METHODS,
  type ActionType,
  type VerificationMethod,
} from "@/lib/types";
import { Button } from "@/components/primitives/Button";
import { FileDropZone } from "@/components/primitives/FileDropZone";
import { CoordinateInput, type Coordinates } from "@/components/globe/CoordinateInput";

type SelectableAction = Exclude<ActionType, "fail_test">;

const ACTIONS = Object.keys(ACTION_LABELS) as SelectableAction[];

const METHOD_HINT: Record<VerificationMethod, string> = {
  satellite: "Verified from orbit — drop a pin on the parcel and set the period.",
  ocr: "Verified from the document — upload the invoice or bill.",
  gps: "Verified from the trip log — upload the GPS file.",
};

export default function NewClaimPage() {
  const router = useRouter();
  const [action, setAction] = useState<SelectableAction | null>(null);
  const [coords, setCoords] = useState<Coordinates>({ lat: null, lng: null, radius_m: 500 });
  const [beforeDate, setBeforeDate] = useState("");
  const [afterDate, setAfterDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const method = action ? ACTION_METHODS[action] : null;

  const validationError = useMemo((): string | null => {
    if (!action || !method) return null;
    if (method === "satellite") {
      const { lat, lng, radius_m } = coords;
      if (lat == null || lng == null || !beforeDate || !afterDate) {
        return "Satellite claims need a location, a radius and both dates";
      }
      if (lat < -90 || lat > 90) return "Latitude must be between -90 and 90";
      if (lng < -180 || lng > 180) return "Longitude must be between -180 and 180";
      if (radius_m < 50 || radius_m > 50000) return "Radius must be between 50 m and 50 km";
      if (!(beforeDate < afterDate)) return "The before date must come first";
      return null;
    }
    if (!file) return "This claim needs a file";
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
      setError(e instanceof ApiError ? e.message : "The claim could not be submitted");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <h1 className="type-display-l">Make a claim</h1>
        <p className="mt-1 text-sm text-graticule">
          Log the action you took. The right verification method follows from the action.
        </p>
      </header>

      {/* Step 1 — choose the action */}
      <section aria-label="Choose the action">
        <span className="type-label-xs mb-3 block">The action</span>
        <div role="radiogroup" aria-label="Action type" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ACTIONS.map((a) => {
            const active = action === a;
            return (
              <button
                key={a}
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setAction(a);
                  setError(null);
                }}
                className={`rounded-[var(--radius-row)] border px-3 py-3 text-left text-sm transition-all ${
                  active
                    ? "border-limb bg-[var(--limb-dim)] text-airglow"
                    : "border-[var(--rule)] bg-shelf text-graticule hover:border-[var(--rule-strong)] hover:text-airglow"
                }`}
              >
                {ACTION_LABELS[a]}
                <span className="type-mono-s mt-1 block text-graticule">
                  {ACTION_METHODS[a]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 2 — evidence */}
      {action && method && (
        <motion.section
          key={method === "satellite" ? "satellite" : "file"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          aria-label="Evidence"
          className="flex flex-col gap-4"
        >
          <div>
            <span className="type-label-xs block">The evidence</span>
            <p className="mt-1 text-sm text-graticule">{METHOD_HINT[method]}</p>
          </div>

          {method === "satellite" ? (
            <>
              <CoordinateInput value={coords} onChange={setCoords} />
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="before-date" className="type-label-xs">
                    Before
                  </label>
                  <input
                    id="before-date"
                    type="date"
                    value={beforeDate}
                    onChange={(e) => setBeforeDate(e.target.value)}
                    className="type-mono-m input-instrument [color-scheme:dark]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="after-date" className="type-label-xs">
                    After
                  </label>
                  <input
                    id="after-date"
                    type="date"
                    value={afterDate}
                    onChange={(e) => setAfterDate(e.target.value)}
                    className="type-mono-m input-instrument [color-scheme:dark]"
                  />
                </div>
              </div>
            </>
          ) : (
            <FileDropZone file={file} onChange={setFile} onError={setError} />
          )}
        </motion.section>
      )}

      {/* Step 3 — submit */}
      {action && (
        <section className="flex flex-col gap-3">
          {error && (
            <p role="alert" className="text-sm text-oxide">
              {error}
            </p>
          )}
          <div>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit claim"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
