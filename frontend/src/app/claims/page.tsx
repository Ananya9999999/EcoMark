"use client";

/**
 * Claim history. Newest first, multi-select filters and sort, rows in a
 * non-terminal status poll and update live without a refresh.
 *
 * Filtering runs client-side so several axes can combine at once; the list
 * is bounded at 200 rows, far beyond demo scale.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { listClaims, messageFrom } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { useSessionGuard } from "@/lib/useSessionGuard";
import { ACTION_METHODS, actionLabel, isTerminal, type ClaimSummary } from "@/lib/types";
import { usePolling } from "@/lib/usePolling";
import { Button } from "@/components/primitives/Button";
import { EmptyState } from "@/components/primitives/EmptyState";
import { ErrorPanel } from "@/components/primitives/ErrorPanel";
import { SkeletonRows } from "@/components/primitives/Skeleton";
import { ClaimRow } from "@/components/claims/ClaimRow";
import {
  activeCount,
  EMPTY_FILTERS,
  FilterChips,
  FilterMenu,
  type Filters,
} from "@/components/claims/FilterMenu";

function methodOf(claim: ClaimSummary) {
  return ACTION_METHODS[claim.action_type as keyof typeof ACTION_METHODS] ?? "ocr";
}

export default function ClaimsPage() {
  const ready = useSessionGuard();
  const [claims, setClaims] = useState<ClaimSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const { currentUserId } = useApp();
  const seq = useRef(0);

  const load = useCallback(async () => {
    const mySeq = ++seq.current;
    try {
      const list = await listClaims({ limit: 200 });
      if (mySeq !== seq.current) return;
      setClaims(list.claims);
      setError(null);
    } catch (e) {
      if (mySeq !== seq.current) return;
      setError(messageFrom(e, "Claims could not be loaded"));
    }
  }, []);

  useEffect(() => {
    setClaims(null);
    load();
  }, [load, currentUserId]);

  usePolling(load, claims?.some((c) => !isTerminal(c.status)) ?? false);

  const visible = useMemo(() => {
    if (!claims) return null;
    const { statuses, categories, methods, sort } = filters;
    const rows = claims.filter(
      (c) =>
        (statuses.length === 0 || statuses.includes(c.status)) &&
        (categories.length === 0 || (c.category != null && categories.includes(c.category))) &&
        (methods.length === 0 || methods.includes(methodOf(c))),
    );
    const sorted = [...rows];
    if (sort === "newest") sorted.sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
    if (sort === "oldest") sorted.sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));
    if (sort === "credits")
      sorted.sort((a, b) => (b.credits_awarded ?? 0) - (a.credits_awarded ?? 0));
    if (sort === "action")
      sorted.sort((a, b) =>
        actionLabel(a.action_type).localeCompare(actionLabel(b.action_type)),
      );
    return sorted;
  }, [claims, filters]);

  if (!ready) return null;

  const filtering = activeCount(filters) > 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="t-label">Ledger</span>
          <h1 className="t-40 mt-2 text-primary">Claims</h1>
          <p className="t-14 mt-2 text-secondary">
            Every action you have logged and where it got to.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {claims && (
            <span className="mono-12 text-muted">
              {visible?.length ?? 0} of {claims.length}
            </span>
          )}
          <FilterMenu filters={filters} onChange={setFilters} />
        </div>
      </header>

      <FilterChips filters={filters} onChange={setFilters} />

      {error ? (
        <ErrorPanel message={error} onRetry={load} />
      ) : visible == null ? (
        <div className="panel overflow-hidden">
          <SkeletonRows count={6} />
        </div>
      ) : visible.length === 0 ? (
        filtering ? (
          <EmptyState
            title="Nothing matches"
            body="No claims match these filters. Clear them to see everything you have logged."
            action={
              <Button
                variant="secondary"
                onClick={() => setFilters({ ...EMPTY_FILTERS, sort: filters.sort })}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No claims yet"
            body="Log your first action to start measuring. Plant trees, install solar, cut a bill — each one becomes a verified credit."
            action={
              <Link href="/claims/new">
                <Button>Log an action</Button>
              </Link>
            }
          />
        )
      ) : (
        <ul className="panel overflow-hidden">
          {visible.map((claim, i) => (
            <ClaimRow key={claim.claim_id} claim={claim} index={i} />
          ))}
        </ul>
      )}
    </div>
  );
}
