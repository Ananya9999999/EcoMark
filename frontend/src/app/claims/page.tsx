"use client";

/**
 * Claim history (8.4): newest first, status + category filters, rows in a
 * non-terminal status keep polling and update live.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";

import { ApiError, listClaims } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import {
  actionLabel,
  CATEGORIES,
  isTerminal,
  type ClaimStatus,
  type ClaimSummary,
} from "@/lib/types";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/primitives/Button";
import { CategoryDot } from "@/components/primitives/CategoryDot";
import { EmptyState } from "@/components/primitives/EmptyState";
import { ErrorPanel } from "@/components/primitives/ErrorPanel";
import { SkeletonRows } from "@/components/primitives/Skeleton";
import { StatusBadge } from "@/components/primitives/StatusBadge";

const STATUSES: ClaimStatus[] = [
  "submitted",
  "verifying",
  "verified",
  "rejected",
  "minting",
  "minted",
  "mint_failed",
];

export default function ClaimsPage() {
  const [claims, setClaims] = useState<ClaimSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const { currentUserId } = useApp();

  const load = useCallback(async () => {
    try {
      const list = await listClaims({
        status: status || undefined,
        category: category || undefined,
        limit: 100,
      });
      setClaims(list.claims);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Claims could not be loaded");
    }
  }, [status, category]);

  useEffect(() => {
    setClaims(null);
    load();
  }, [load, currentUserId]);

  // Live rows: while any listed claim is non-terminal, poll every 2s.
  useEffect(() => {
    if (!claims || !claims.some((c) => !isTerminal(c.status))) return;
    const interval = window.setInterval(load, 2000);
    return () => window.clearInterval(interval);
  }, [claims, load]);

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
        className="rounded-[var(--radius-instrument)] border border-[var(--rule-strong)] bg-shelf px-2 py-1 text-sm text-airglow"
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
          {select("Status", "filter-status", status, setStatus, STATUSES)}
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
            <motion.li
              key={claim.claim_id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 10) * 0.035, duration: 0.25 }}
            >
              <Link
                href={`/claims/${claim.claim_id}`}
                className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-[var(--graticule-dim)]"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm text-airglow">
                    {actionLabel(claim.action_type)}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-graticule">
                    <span className="type-mono-s">{formatDate(claim.submitted_at)}</span>
                    {claim.category && (
                      <span className="flex items-center gap-1">
                        <CategoryDot category={claim.category} />
                        {claim.category}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {claim.credits_awarded != null && claim.status === "minted" && (
                    <span className="type-mono-m text-airglow">
                      +{claim.credits_awarded.toFixed(1)}
                    </span>
                  )}
                  <StatusBadge status={claim.status} />
                </div>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
