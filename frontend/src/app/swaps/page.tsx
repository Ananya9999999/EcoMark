"use client";

/**
 * Trades. A trade is a two-sided request: you propose, and nothing moves
 * until the other person accepts. The UI says so explicitly — the earlier
 * version left that mechanism invisible.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

import {
  acceptSwap,
  createSwap,
  listSwaps,
  listUsers,
  messageFrom,
  rejectSwap,
} from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { useSessionGuard } from "@/lib/useSessionGuard";
import { CATEGORIES, type CreditCategory, type SwapItem, type UserInfo } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/primitives/Button";
import { ConfirmDialog } from "@/components/primitives/ConfirmDialog";
import { ErrorPanel } from "@/components/primitives/ErrorPanel";
import { SkeletonRows } from "@/components/primitives/Skeleton";
import { SwapStatusBadge } from "@/components/primitives/StatusBadge";
import { CATEGORY_COLOR } from "@/components/primitives/CategoryDot";

/** One side of a trade, in its category colour. */
function Side({
  label,
  category,
  amount,
}: {
  label: string;
  category: CreditCategory;
  amount: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="t-label" style={{ fontSize: 12 }}>
        {label}
      </span>
      <span className="flex items-baseline gap-2">
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 shrink-0"
          style={{ background: CATEGORY_COLOR[category] }}
        />
        <span className="mono-20 text-primary">{amount.toFixed(1)}</span>
        <span className="t-12 text-secondary">{category}</span>
      </span>
    </div>
  );
}

function CategorySelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: CreditCategory;
  onChange: (c: CreditCategory) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as CreditCategory)}
      className="field t-14"
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
      .catch((e) => setUsersError(messageFrom(e, "Traders could not be loaded")));
  }, []);

  useEffect(() => {
    setUsers(null);
    loadUsers();
  }, [loadUsers, currentUserId]);

  const available = balance?.balances[offerCategory] ?? null;
  const offer = Number(offerAmount);
  const want = Number(wantAmount);
  const overOffering = available != null && offer > available;

  const validation = useMemo((): string | null => {
    if (!counterparty) return "Choose who to trade with.";
    if (!offerAmount || !wantAmount || offer <= 0 || want <= 0)
      return "Both amounts must be greater than zero.";
    if (overOffering)
      return `You hold ${available?.toFixed(1)} ${offerCategory} credits but offered ${offer.toFixed(1)}.`;
    return null;
  }, [counterparty, offerAmount, wantAmount, offer, want, overOffering, available, offerCategory]);

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
      setError(messageFrom(e, "The trade request could not be sent"));
    } finally {
      setBusy(false);
    }
  };

  if (usersError) return <ErrorPanel message={usersError} onRetry={loadUsers} />;

  return (
    <section aria-label="Propose a trade" className="panel p-6">
      <span className="t-label">Propose a trade</span>
      <p className="t-14 mt-1 text-secondary">
        You send a request. Nothing moves until they accept it.
      </p>

      {users == null ? (
        <div className="mt-5">
          <SkeletonRows count={2} />
        </div>
      ) : users.length === 0 ? (
        <p className="t-14 mt-5 text-secondary">
          No one else is holding credits yet. Other traders appear here as they join.
        </p>
      ) : (
        <div className="mt-5 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="counterparty" className="t-label">
              Trade with
            </label>
            <select
              id="counterparty"
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
              className="field t-14 w-full max-w-xs"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-5 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="offer-amount" className="t-label">
                You give
              </label>
              <div className="flex gap-2">
                <CategorySelect
                  id="offer-category"
                  value={offerCategory}
                  onChange={setOfferCategory}
                />
                <input
                  id="offer-amount"
                  type="number"
                  min="0"
                  step="0.1"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="0.0"
                  aria-invalid={overOffering}
                  className="field mono-14 w-24"
                />
              </div>
              <span className={`mono-12 ${overOffering ? "text-[var(--alert)]" : "text-muted"}`}>
                {available != null ? `${available.toFixed(1)} available` : "—"}
              </span>
            </div>

            <span aria-hidden className="mono-20 hidden pb-7 text-muted sm:block">
              ⇄
            </span>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="want-amount" className="t-label">
                You get
              </label>
              <div className="flex gap-2">
                <CategorySelect
                  id="want-category"
                  value={wantCategory}
                  onChange={setWantCategory}
                />
                <input
                  id="want-amount"
                  type="number"
                  min="0"
                  step="0.1"
                  value={wantAmount}
                  onChange={(e) => setWantAmount(e.target.value)}
                  placeholder="0.0"
                  className="field mono-14 w-24"
                />
              </div>
              <span className="mono-12 text-muted">from {counterpartyName || "them"}</span>
            </div>
          </div>

          {error && (
            <p role="alert" className="t-14 shake text-[var(--alert)]">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <Button
              disabled={validation != null}
              onClick={() => {
                setError(null);
                setConfirming(true);
              }}
            >
              Review trade
            </Button>
            {validation && <span className="mono-12 text-muted">{validation}</span>}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        title="Send this trade request?"
        confirmLabel="Send request"
        busy={busy}
        onConfirm={submit}
        onCancel={() => setConfirming(false)}
      >
        <span className="block">
          You give <strong className="text-primary">{offer.toFixed(1)} {offerCategory}</strong>{" "}
          and receive{" "}
          <strong className="text-primary">{want.toFixed(1)} {wantCategory}</strong> from{" "}
          {counterpartyName || "them"}.
        </span>
        <span className="mt-3 block text-muted">
          Your credits stay yours until {counterpartyName || "they"} accepts. You can
          withdraw nothing once accepted — the ledger settles both sides at once.
        </span>
      </ConfirmDialog>
    </section>
  );
}

function TradeRow({
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
  // For incoming, they give what they offered and want yours; mirrored for outgoing.
  const youGet = incoming ? swap.they_offer : swap.they_want;
  const youGive = incoming ? swap.they_want : swap.they_offer;

  return (
    <li className="border-b border-line px-5 py-4 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="t-14 text-primary">
            {incoming ? (
              <>
                <strong>{swap.counterparty.name}</strong> wants to trade with you
              </>
            ) : (
              <>
                You asked <strong>{swap.counterparty.name}</strong>
              </>
            )}
          </p>
          <p className="mono-12 mt-0.5 text-muted">{formatDateTime(swap.created_at)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {incoming && swap.status === "pending" ? (
            <>
              <Button onClick={() => onAccept?.(swap.swap_id)} disabled={busy}>
                {busy ? "Settling…" : "Accept"}
              </Button>
              <Button variant="ghost" onClick={() => onReject?.(swap.swap_id)} disabled={busy}>
                Decline
              </Button>
            </>
          ) : (
            <SwapStatusBadge status={swap.status} />
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-10 gap-y-3">
        <Side label="You give" category={youGive.category} amount={youGive.amount} />
        <span aria-hidden className="mono-16 text-muted">
          ⇄
        </span>
        <Side label="You get" category={youGet.category} amount={youGet.amount} />
      </div>
    </li>
  );
}

export default function SwapsPage() {
  const ready = useSessionGuard();
  const [swaps, setSwaps] = useState<{ incoming: SwapItem[]; outgoing: SwapItem[] } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { refreshBalance, currentUserId } = useApp();
  const seq = useRef(0);

  const load = useCallback(async () => {
    const mySeq = ++seq.current;
    try {
      const data = await listSwaps();
      if (mySeq !== seq.current) return;
      setSwaps(data);
      setError(null);
    } catch (e) {
      if (mySeq !== seq.current) return;
      setError(messageFrom(e, "Trades could not be loaded"));
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
      setActionError(messageFrom(e, "The trade could not be completed"));
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
      setActionError(messageFrom(e, "The trade could not be declined"));
    } finally {
      setBusyId(null);
    }
  };

  if (!ready) return null;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <span className="t-label">Marketplace</span>
        <h1 className="t-40 mt-2 text-primary">Trades</h1>
        <p className="t-14 mt-2 max-w-xl text-secondary">
          Credits come in four categories. Trading swaps one category for another with
          someone who needs the opposite of what you hold.
        </p>
      </header>

      <ProposePanel onCreated={load} />

      {actionError && (
        <ErrorPanel message={actionError} onRetry={() => setActionError(null)} retryLabel="Dismiss" />
      )}

      {error ? (
        <ErrorPanel message={error} onRetry={load} />
      ) : swaps == null ? (
        <div className="panel overflow-hidden">
          <SkeletonRows count={3} />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="flex flex-col gap-6"
        >
          <section aria-label="Requests to you" className="panel overflow-hidden">
            <div className="flex items-center justify-between px-5 pb-3 pt-5">
              <span className="t-label">Requests to you</span>
              {swaps.incoming.length > 0 && (
                <span className="mono-12 text-signal">{swaps.incoming.length} waiting</span>
              )}
            </div>
            {swaps.incoming.length === 0 ? (
              <p className="t-14 px-5 pb-5 text-secondary">
                No one has proposed a trade to you. Send one above to get started.
              </p>
            ) : (
              <ul className="border-t border-line">
                {swaps.incoming.map((s) => (
                  <TradeRow
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

          <section aria-label="Your requests" className="panel overflow-hidden">
            <span className="t-label block px-5 pb-3 pt-5">Your requests</span>
            {swaps.outgoing.length === 0 ? (
              <p className="t-14 px-5 pb-5 text-secondary">
                You have not proposed any trades yet.
              </p>
            ) : (
              <ul className="border-t border-line">
                {swaps.outgoing.map((s) => (
                  <TradeRow key={s.swap_id} swap={s} incoming={false} />
                ))}
              </ul>
            )}
          </section>
        </motion.div>
      )}
    </div>
  );
}
