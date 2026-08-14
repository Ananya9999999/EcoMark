"use client";

/**
 * Overview. The atmospheric field sits behind the header, its order and
 * colour mix driven by the user's real balance (design.md §5).
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import { listClaims, messageFrom } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { useSessionGuard } from "@/lib/useSessionGuard";
import { CATEGORIES, isTerminal, type ClaimSummary } from "@/lib/types";
import { usePolling } from "@/lib/usePolling";
import { AtmosphericField } from "@/components/three/AtmosphericField";
import { BalanceInstrument } from "@/components/BalanceInstrument";
import { Button } from "@/components/primitives/Button";
import { ErrorPanel } from "@/components/primitives/ErrorPanel";
import { SkeletonBlock, SkeletonRows } from "@/components/primitives/Skeleton";
import { ClaimRow } from "@/components/claims/ClaimRow";

function RecentActivity() {
  const [claims, setClaims] = useState<ClaimSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { currentUserId, refreshBalance } = useApp();
  const hadLive = useRef(false);
  const seq = useRef(0);

  const load = useCallback(() => {
    const mySeq = ++seq.current;
    listClaims({ limit: 6 })
      .then((list) => {
        if (mySeq !== seq.current) return;
        setClaims(list.claims);
        setError(null);
        const hasLive = list.claims.some((c) => !isTerminal(c.status));
        if (hadLive.current && !hasLive) refreshBalance();
        hadLive.current = hasLive;
      })
      .catch((e) => {
        if (mySeq !== seq.current) return;
        setError(messageFrom(e, "Recent activity could not be loaded"));
      });
  }, [refreshBalance]);

  useEffect(() => {
    setClaims(null);
    hadLive.current = false;
    load();
  }, [load, currentUserId]);

  usePolling(load, claims?.some((c) => !isTerminal(c.status)) ?? false);

  return (
    <section aria-label="Recent activity" className="panel overflow-hidden">
      <div className="flex items-center justify-between px-6 pb-3 pt-5">
        <span className="t-label">Recent activity</span>
        <Link href="/claims" className="t-12 text-signal hover:underline">
          All claims →
        </Link>
      </div>

      {error ? (
        <div className="px-6 pb-6">
          <ErrorPanel message={error} onRetry={load} />
        </div>
      ) : claims == null ? (
        <SkeletonRows count={5} />
      ) : claims.length === 0 ? (
        <div className="px-6 pb-7 pt-1">
          <p className="t-16 text-primary">No claims yet.</p>
          <p className="t-14 mt-1 max-w-md text-secondary">
            Log your first action to start measuring. Plant trees, install
            solar, cut a bill — each becomes a verified credit.
          </p>
          <Link href="/claims/new" className="mt-5 inline-block">
            <Button>Log an action</Button>
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col border-t border-line">
          {claims.map((claim, i) => (
            <ClaimRow key={claim.claim_id} claim={claim} index={i} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const { balance, balanceError, refreshBalance, currentUser } = useApp();
  const ready = useSessionGuard();

  if (!ready) return null;

  // The field's order follows total holdings; its colour follows composition.
  const total = balance?.total ?? 0;
  const order = Math.min(0.85, 0.15 + total / 60);
  const mix = balance
    ? {
        land: (balance.balances.land ?? 0) + 0.05,
        energy: (balance.balances.energy ?? 0) + 0.05,
        water: (balance.balances.water ?? 0) + 0.05,
        transport: (balance.balances.transport ?? 0) + 0.05,
      }
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      {/* header band with the field behind it */}
      <header className="relative -mx-4 -mt-8 overflow-hidden px-4 pb-8 pt-10 md:-mx-6 md:-mt-10 md:px-6 md:pt-14">
        <AtmosphericField
          mode="ambient"
          order={order}
          mix={mix}
          className="pointer-events-none absolute inset-0 opacity-80"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, transparent 30%, var(--bg-void) 96%)",
          }}
        />
        <div className="relative z-10">
          <span className="t-label">Station</span>
          <h1 className="t-40 mt-2 text-primary">
            {currentUser ? currentUser.name : "Ledger"}
          </h1>
          <p className="t-14 mt-2 max-w-lg text-secondary">
            Verified climate actions and the credits they hold. Every figure
            below is measured, not estimated.
          </p>
        </div>
      </header>

      {balanceError ? (
        <ErrorPanel
          message="Holdings can't be read from the ledger right now. Everything else on this page still works."
          onRetry={() => refreshBalance()}
        />
      ) : balance == null ? (
        <SkeletonBlock className="h-56 w-full" />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <BalanceInstrument balance={balance} />
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <RecentActivity />

        <section className="panel flex flex-col items-start gap-3 p-6">
          <span className="t-label">Next</span>
          <h2 className="t-20 text-primary">Log an action</h2>
          <p className="t-14 text-secondary">
            Coordinates for land claims, a bill or invoice for energy and
            water, a trip log for commuting. Verification runs automatically.
          </p>
          <Link href="/claims/new" className="mt-2">
            <Button>Log an action</Button>
          </Link>

          <dl className="mt-6 grid w-full grid-cols-2 gap-4 border-t border-line pt-5">
            {CATEGORIES.map((c) => (
              <div key={c}>
                <dt className="t-label" style={{ letterSpacing: "0.1em" }}>
                  {c}
                </dt>
                <dd className="mono-14 mt-1 text-secondary">
                  {balance ? (balance.balances[c] ?? 0).toFixed(1) : "—"}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
