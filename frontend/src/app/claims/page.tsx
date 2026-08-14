"use client";

/**
 * Claim history (8.4): newest first, status + category filters, rows in a
 * non-terminal status keep polling and update live.
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { listClaims, messageFrom } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import {
  CATEGORIES,
  CLAIM_STATUSES,
  isTerminal,
  type ClaimSummary,
} from "@/lib/types";
import { usePolling } from "@/lib/usePolling";
import { Button } from "@/components/primitives/Button";
import { EmptyState } from "@/components/primitives/EmptyState";
import { ErrorPanel } from "@/components/primitives/ErrorPanel";
import { SkeletonRows } from "@/components/primitives/Skeleton";
import { ClaimRow } from "@/components/claims/ClaimRow";

export default function ClaimsPage() {
  const [claims, setClaims] = useState<ClaimSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const { currentUserId } = useApp();

  // Monotonic token: a slow response for an old filter/user can never
  // overwrite the list for the current one.
  const seq = useRef(0);

  const load = useCallback(async () => {
    const mySeq = ++seq.current;
    try {
      const list = await listClaims({
        status: status || undefined,
        category: category || undefined,
        limit: 100,
      });
      if (mySeq !== seq.current) return; // stale — drop it
      setClaims(list.claims);
      setError(null);
    } catch (e) {
      if (mySeq !== seq.current) return;
      setError(messageFrom(e, "Claims could not be loaded"));
    }
  }, [status, category]);

  useEffect(() => {
    setClaims(null);
    load();
  }, [load, currentUserId]);

  // Live rows: while any listed claim is non-terminal, poll every 2s.
  usePolling(load, claims?.some((c) => !isTerminal(c.status)) ?? false);

  const select = (
    label: string,
    id: string,
    value: string,
    onChange: (v: string) => void,
    options: string[],
  ) => (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="type-label-xs">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-instrument"
      >
        <option value="">all</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o.replace("_", " ")}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="type-display-l">My claims</h1>
          <p className="mt-1 text-sm text-graticule">
            Every action you have logged, newest first.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          {select("Status", "filter-status", status, setStatus, CLAIM_STATUSES)}
          {select("Category", "filter-category", category, setCategory, CATEGORIES)}
        </div>
      </header>

      {error ? (
        <ErrorPanel message={error} onRetry={load} />
      ) : claims == null ? (
        <div className="surface-shelf p-0">
          <SkeletonRows count={6} />
        </div>
      ) : claims.length === 0 ? (
        status || category ? (
          <EmptyState
            title="Nothing matches"
            body="No claims match these filters. Clear them to see everything you have logged."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setStatus("");
                  setCategory("");
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No claims yet"
            body="Log your first climate action — plant trees, install solar, cut a bill — and it will be verified and credited here."
            action={
              <Link href="/claims/new">
                <Button>Make a claim</Button>
              </Link>
            }
          />
        )
      ) : (
        <ul className="surface-shelf flex flex-col divide-y divide-[var(--rule)] p-0">
          {claims.map((claim, i) => (
            <ClaimRow key={claim.claim_id} claim={claim} index={i} />
          ))}
        </ul>
      )}
    </div>
  );
}
