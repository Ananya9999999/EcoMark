"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";

import { listClaims } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { actionLabel, CATEGORIES, type ClaimSummary } from "@/lib/types";
import { Button } from "@/components/primitives/Button";
import { CATEGORY_COLOR, CategoryDot } from "@/components/primitives/CategoryDot";
import { EmptyState } from "@/components/primitives/EmptyState";
import { ErrorPanel } from "@/components/primitives/ErrorPanel";
import { SkeletonBlock, SkeletonRows } from "@/components/primitives/Skeleton";
import { StatusBadge } from "@/components/primitives/StatusBadge";
import { AnimatedNumber } from "@/components/primitives/AnimatedNumber";
import { formatDate } from "@/lib/format";

/** The ledger strip: four category readouts whose bar lengths are the chart. */
function BalanceStrip() {
  const { balance, balanceError, refreshBalance } = useApp();

  if (balanceError) {
    return (
      <ErrorPanel
        message="Your balance can't be read right now. The rest of the dashboard still works."
        onRetry={() => refreshBalance()}
      />
    );
  }
  if (balance == null) {
    return <SkeletonBlock className="h-44 w-full" />;
  }

  const max = Math.max(...CATEGORIES.map((c) => balance.balances[c] ?? 0), 0.001);

  return (
    <section aria-label="Credit balance" className="surface-shelf p-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <span className="type-label-xs">Balance</span>
        <div className="text-right">
          <div className="type-mono-l text-airglow">
            <AnimatedNumber value={balance.total} decimals={1} />
          </div>
          <div className="text-xs text-graticule">credits total</div>
        </div>
      </div>
      <dl className="flex flex-col gap-2.5">
        {CATEGORIES.map((cat, i) => {
          const amount = balance.balances[cat] ?? 0;
          return (
            <div key={cat} className="grid grid-cols-[6rem_1fr_3.5rem] items-center gap-3">
              <dt className="flex items-center gap-2 text-sm text-graticule">
                <CategoryDot category={cat} />
                {cat}
              </dt>
              <dd className="h-2 overflow-hidden rounded-full bg-night-ocean">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: CATEGORY_COLOR[cat] }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(amount / max) * 100}%` }}
                  transition={{ duration: 0.6, delay: i * 0.06, ease: "easeOut" }}
                />
              </dd>
              <dd className="type-mono-s text-right text-airglow">
                <AnimatedNumber value={amount} decimals={1} />
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function RecentClaims() {
  const [claims, setClaims] = useState<ClaimSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { currentUserId } = useApp();

  const load = useCallback(() => {
    setError(null);
    listClaims({ limit: 5 })
      .then((list) => setClaims(list.claims))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    setClaims(null);
    load();
  }, [load, currentUserId]);

  return (
    <section aria-label="Recent claims" className="surface-shelf min-w-0 flex-[1.6] p-0">
      <div className="flex items-center justify-between px-6 pb-2 pt-5">
        <span className="type-label-xs">Recent claims</span>
        <Link href="/claims" className="text-xs text-limb hover:underline">
          All claims →
        </Link>
      </div>
      {error ? (
        <div className="p-4">
          <ErrorPanel message={error} onRetry={load} />
        </div>
      ) : claims == null ? (
        <SkeletonRows count={5} />
      ) : claims.length === 0 ? (
        <div className="px-6 pb-6 pt-2">
          <p className="mb-4 text-sm text-graticule">
            Nothing verified yet. Log your first climate action and watch it become credits.
          </p>
          <Link href="/claims/new">
            <Button>Make a claim</Button>
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--rule)]">
          {claims.map((claim, i) => (
            <motion.li
              key={claim.claim_id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.035, duration: 0.25 }}
            >
              <Link
                href={`/claims/${claim.claim_id}`}
                className="flex items-center justify-between gap-4 px-6 py-3.5 transition-colors hover:bg-[var(--graticule-dim)]"
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
                  {claim.credits_awarded != null && (
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
    </section>
  );
}

function ActionPanel() {
  return (
    <section className="surface-shelf flex flex-1 flex-col items-start gap-3 p-6">
      <h2 className="type-display-m">Make a claim</h2>
      <p className="text-sm text-graticule">
        Log an action you have taken — planting, solar, an EV, a lower bill, a greener
        commute — and have it verified from orbit, from documents, or from trip logs.
      </p>
      <Link href="/claims/new" className="mt-2">
        <Button>Make a claim</Button>
      </Link>
    </section>
  );
}

export default function Dashboard() {
  const { currentUser } = useApp();
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <h1 className="type-display-l">
          {currentUser ? `${currentUser.name}'s ledger` : "Ledger"}
        </h1>
        <p className="mt-1 text-sm text-graticule">
          Verified climate actions, measured and credited.
        </p>
      </header>
      <BalanceStrip />
      <div className="flex flex-col gap-6 lg:flex-row">
        <RecentClaims />
        <ActionPanel />
      </div>
    </div>
  );
}
