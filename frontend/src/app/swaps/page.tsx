"use client";

/**
 * Swap marketplace (8.6): propose with balance shown inline and client-side
 * over-offer blocking, a plain-words confirmation step, incoming accepts and
 * rejects, outgoing with status.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

import {
  acceptSwap,
  ApiError,
  createSwap,
  listSwaps,
  listUsers,
  rejectSwap,
} from "@/lib/api";
import { useApp } from "@/lib/app-context";
import {
  CATEGORIES,
  type CreditCategory,
  type SwapItem,
  type UserInfo,
} from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/primitives/Button";
import { CategoryDot } from "@/components/primitives/CategoryDot";
import { ConfirmDialog } from "@/components/primitives/ConfirmDialog";
import { ErrorPanel } from "@/components/primitives/ErrorPanel";
import { SkeletonRows } from "@/components/primitives/Skeleton";
import { SwapStatusBadge } from "@/components/primitives/StatusBadge";

function categorySelect(
  id: string,
  value: CreditCategory,
  onChange: (c: CreditCategory) => void,
) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as CreditCategory)}
      className="input-instrument text-sm"
    >
      {CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

function ProposePanel({ onCreated }: { onCreated: () => void }) {
  const { balance, currentUserId } = useApp();
  const [users, setUsers] = useState<UserInfo[] | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [counterparty, setCounterparty] = useState("");
  const [offerCategory, setOfferCategory] = useState<CreditCategory>("land");
  const [offerAmount, setOfferAmount] = useState("");
  const [wantCategory, setWantCategory] = useState<CreditCategory>("energy");
  const [wantAmount, setWantAmount] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(() => {
    setUsersError(null);
    listUsers()
      .then((l) => {
        setUsers(l.users);
        setCounterparty((prev) => prev || l.users[0]?.id || "");
      })
      .catch((e) => setUsersError(e instanceof ApiError ? e.message : "Users could not be loaded"));
  }, []);

  useEffect(() => {
    setUsers(null);
    loadUsers();
  }, [loadUsers, currentUserId]);

  const available = balance?.balances[offerCategory] ?? null;
  const offer = Number(offerAmount);
  const want = Number(wantAmount);

  const validation = useMemo((): string | null => {
    if (!counterparty) return "Pick who to trade with";
    if (!offerAmount || !wantAmount || offer <= 0 || want <= 0)
      return "Amounts must be greater than zero";
    if (available != null && offer > available)
      return `You don't have enough ${offerCategory} credits`;
    return null;
  }, [counterparty, offerAmount, wantAmount, offer, want, available, offerCategory]);

  const counterpartyName = users?.find((u) => u.id === counterparty)?.name ?? "";

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await createSwap({
        counterparty_id: counterparty,
        offer_category: offerCategory,
        offer_amount: offer,
        want_category: wantCategory,
        want_amount: want,
      });
      setConfirming(false);
      setOfferAmount("");
      setWantAmount("");
      onCreated();
    } catch (e) {
      setConfirming(false);
      setError(e instanceof ApiError ? e.message : "The trade could not be created");
    } finally {
      setBusy(false);
    }
  };

  if (usersError) {
    return <ErrorPanel message={usersError} onRetry={loadUsers} />;
  }

  return (
    <section aria-label="Propose a trade" className="surface-shelf p-6">
      <span className="type-label-xs mb-4 block">Propose a trade</span>
      {users == null ? (
        <SkeletonRows count={2} />
      ) : users.length === 0 ? (
        <p className="text-sm text-graticule">
          There is no one to trade with yet — other users will appear here.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="swap-counterparty" className="type-label-xs">
              Trade with
            </label>
            <select
              id="swap-counterparty"
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
              className="input-instrument w-full max-w-xs text-sm"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="offer-amount" className="type-label-xs">
                You give
              </label>
              <div className="flex gap-2">
                {categorySelect("offer-category", offerCategory, setOfferCategory)}
                <input
                  id="offer-amount"
                  type="number"
                  min="0"
                  step="0.1"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="0.0"
                  className="type-mono-m input-instrument w-24"
                />
              </div>
              {available != null && (
                <span className="type-mono-s text-graticule">
                  {available.toFixed(1)} {offerCategory} available
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="want-amount" className="type-label-xs">
                You get
              </label>
              <div className="flex gap-2">
                {categorySelect("want-category", wantCategory, setWantCategory)}
                <input
                  id="want-amount"
                  type="number"
                  min="0"
                  step="0.1"
                  value={wantAmount}
                  onChange={(e) => setWantAmount(e.target.value)}
                  placeholder="0.0"
                  className="type-mono-m input-instrument w-24"
                />
              </div>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-oxide">
              {error}
            </p>
          )}

          <div>
            <Button
              onClick={() => {
                if (validation) {
                  setError(validation);
                  return;
                }
                setError(null);
                setConfirming(true);
              }}
            >
              Propose trade
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        title="Confirm the trade"
        confirmLabel="Send proposal"
        busy={busy}
        onConfirm={submit}
        onCancel={() => setConfirming(false)}
      >
        You give{" "}
        <strong>
          {offer ? offer.toFixed(1) : "0"} {offerCategory}
        </strong>{" "}
        credits to {counterpartyName || "them"}, and get{" "}
        <strong>
          {want ? want.toFixed(1) : "0"} {wantCategory}
        </strong>{" "}
        credits back. {counterpartyName || "They"} must accept before anything moves.
      </ConfirmDialog>
    </section>
  );
}

function SwapRow({
  swap,
  incoming,
  onAccept,
  onReject,
  busyId,
}: {
  swap: SwapItem;
  incoming: boolean;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  busyId?: string | null;
}) {
  const busy = busyId === swap.swap_id;
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm text-airglow">
          {incoming ? (
            <>
              <strong>{swap.counterparty.name}</strong> offers{" "}
              <span className="type-mono-m">{swap.they_offer.amount.toFixed(1)}</span>{" "}
              <CategoryDot category={swap.they_offer.category} /> {swap.they_offer.category} for
              your <span className="type-mono-m">{swap.they_want.amount.toFixed(1)}</span>{" "}
              <CategoryDot category={swap.they_want.category} /> {swap.they_want.category}
            </>
          ) : (
            <>
              You offered <span className="type-mono-m">{swap.they_offer.amount.toFixed(1)}</span>{" "}
              <CategoryDot category={swap.they_offer.category} /> {swap.they_offer.category} to{" "}
              <strong>{swap.counterparty.name}</strong> for{" "}
              <span className="type-mono-m">{swap.they_want.amount.toFixed(1)}</span>{" "}
              <CategoryDot category={swap.they_want.category} /> {swap.they_want.category}
            </>
          )}
        </p>
        <p className="type-mono-s mt-1 text-graticule">{formatDateTime(swap.created_at)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {incoming && swap.status === "pending" ? (
          <>
            <Button onClick={() => onAccept?.(swap.swap_id)} disabled={busy}>
              {busy ? "Trading…" : "Accept"}
            </Button>
            <Button variant="ghost" onClick={() => onReject?.(swap.swap_id)} disabled={busy}>
              Decline
            </Button>
          </>
        ) : (
          <SwapStatusBadge status={swap.status} />
        )}
      </div>
    </li>
  );
}

export default function SwapsPage() {
  const [swaps, setSwaps] = useState<{ incoming: SwapItem[]; outgoing: SwapItem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { refreshBalance, currentUserId } = useApp();

  const load = useCallback(async () => {
    try {
      setSwaps(await listSwaps());
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Swaps could not be loaded");
    }
  }, []);

  useEffect(() => {
    setSwaps(null);
    setActionError(null);
    load();
  }, [load, currentUserId]);

  const accept = async (id: string) => {
    setBusyId(id);
    setActionError(null);
    try {
      await acceptSwap(id);
      await load();
      refreshBalance();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "The trade could not be completed");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    setBusyId(id);
    setActionError(null);
    try {
      await rejectSwap(id);
      await load();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "The swap could not be declined");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header>
        <h1 className="type-display-l">Swaps</h1>
        <p className="mt-1 text-sm text-graticule">
          Trade credits with other users. Nothing moves until both sides agree.
        </p>
      </header>

      <ProposePanel onCreated={load} />

      {actionError && <ErrorPanel message={actionError} onRetry={() => setActionError(null)} />}

      {error ? (
        <ErrorPanel message={error} onRetry={load} />
      ) : swaps == null ? (
        <div className="surface-shelf p-0">
          <SkeletonRows count={3} />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-6"
        >
          <section aria-label="Incoming swaps" className="surface-shelf p-0">
            <span className="type-label-xs block px-5 pb-1 pt-5">Incoming</span>
            {swaps.incoming.length === 0 ? (
              <p className="px-5 pb-5 pt-2 text-sm text-graticule">
                No one has proposed a trade to you. Propose one above to get things moving.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-[var(--rule)]">
                {swaps.incoming.map((s) => (
                  <SwapRow
                    key={s.swap_id}
                    swap={s}
                    incoming
                    onAccept={accept}
                    onReject={reject}
                    busyId={busyId}
                  />
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Outgoing swaps" className="surface-shelf p-0">
            <span className="type-label-xs block px-5 pb-1 pt-5">Outgoing</span>
            {swaps.outgoing.length === 0 ? (
              <p className="px-5 pb-5 pt-2 text-sm text-graticule">
                You haven't proposed any trades yet.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-[var(--rule)]">
                {swaps.outgoing.map((s) => (
                  <SwapRow key={s.swap_id} swap={s} incoming={false} />
                ))}
              </ul>
            )}
          </section>
        </motion.div>
      )}
    </div>
  );
}
