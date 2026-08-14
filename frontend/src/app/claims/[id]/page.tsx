"use client";

/**
 * Claim detail: status thread, result, calibrated confidence, generic
 * evidence, location, timeline, and the retry path for mint_failed.
 * Polls every 2s while the status is non-terminal.
 */

import dynamic from "next/dynamic";
import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import { getClaim, messageFrom, retryMint } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { usePolling } from "@/lib/usePolling";
import { useSessionGuard } from "@/lib/useSessionGuard";
import { actionLabel, isTerminal, type ClaimDetail } from "@/lib/types";
import { formatDate, formatDateTime, formatLatLng, formatRadius } from "@/lib/format";
import { Button } from "@/components/primitives/Button";
import { ErrorPanel } from "@/components/primitives/ErrorPanel";
import { SkeletonBlock } from "@/components/primitives/Skeleton";
import { StatusBadge } from "@/components/primitives/StatusBadge";
import { AnimatedNumber } from "@/components/primitives/AnimatedNumber";
import { CATEGORY_COLOR } from "@/components/primitives/CategoryDot";
import { EvidencePanel } from "@/components/claims/EvidencePanel";
import { VerificationWait } from "@/components/claims/VerificationWait";
import { ConfidenceGauge } from "@/components/claims/ConfidenceGauge";

const Globe = dynamic(() => import("@/components/globe/Globe"), { ssr: false });

function CopyableHash({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mono-12 break-all text-secondary" title={hash}>
        {hash}
      </span>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(hash);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          } catch {
            /* clipboard unavailable — the hash is still selectable */
          }
        }}
        className="mono-12 rounded-[var(--r-instrument)] border border-line px-2 py-1 text-secondary transition-colors hover:border-signal hover:text-signal"
      >
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}

function Timeline({ claim }: { claim: ClaimDetail }) {
  const events: { label: string; at: string | null; done: boolean }[] = [
    { label: "Submitted", at: claim.submitted_at, done: true },
    {
      label: claim.status === "rejected" ? "Verification completed" : "Verified",
      at: claim.verified_at,
      done: claim.verified_at != null,
    },
    {
      label:
        claim.status === "mint_failed"
          ? "Minting failed"
          : claim.status === "minted"
            ? "Credits minted"
            : "Minting",
      at: null,
      done: claim.status === "minted" || claim.status === "mint_failed",
    },
  ];

  return (
    <ol className="flex flex-col">
      {events.map((e, i) => (
        <li key={e.label} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              aria-hidden
              className="mt-1.5 inline-block h-2 w-2 rounded-full"
              style={{ background: e.done ? "var(--signal)" : "var(--line)" }}
            />
            {i < events.length - 1 && (
              <span aria-hidden className="w-px flex-1 bg-line" style={{ minHeight: 22 }} />
            )}
          </div>
          <div className="pb-4">
            <p className={`t-14 ${e.done ? "text-primary" : "text-muted"}`}>{e.label}</p>
            {e.at && <p className="mono-12 mt-0.5 text-muted">{formatDateTime(e.at)}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function ClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const ready = useSessionGuard();
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [globeLost, setGlobeLost] = useState(false);
  const { refreshBalance, currentUserId } = useApp();
  const wasNonTerminal = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await getClaim(id);
      setClaim(data);
      setError(null);
      if (wasNonTerminal.current && data.status === "minted") refreshBalance();
      wasNonTerminal.current = !isTerminal(data.status);
    } catch (e) {
      setError(messageFrom(e, "The claim could not be loaded"));
    }
  }, [id, refreshBalance]);

  useEffect(() => {
    setClaim(null);
    setError(null);
    load();
  }, [load, currentUserId]);

  usePolling(load, claim != null && !isTerminal(claim.status));

  const doRetry = async () => {
    setRetrying(true);
    try {
      await retryMint(id);
      await load();
    } catch (e) {
      setError(messageFrom(e, "The retry could not be started"));
    } finally {
      setRetrying(false);
    }
  };

  if (!ready) return null;

  if (error && !claim) {
    return (
      <div className="mx-auto max-w-3xl">
        <ErrorPanel message={error} onRetry={load} />
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <SkeletonBlock className="h-12 w-64" />
        <SkeletonBlock className="h-40 w-full" />
        <SkeletonBlock className="h-64 w-full" />
      </div>
    );
  }

  const verifying = claim.status === "submitted" || claim.status === "verifying";
  const location = claim.location;
  const hasCoords = location?.lat != null && location?.lng != null;
  const isSatellite = claim.method === "satellite" && hasCoords;
  const radiusM = location?.radius_m ?? 0;
  const category = claim.verification?.category;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Link href="/claims" className="mono-12 text-secondary hover:text-signal">
          ← Claims
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-1.5 h-10 w-0.5 shrink-0"
            style={{ background: category ? CATEGORY_COLOR[category] : "var(--line)" }}
          />
          <div>
            <h1 className="t-40 text-primary">{actionLabel(claim.action_type)}</h1>
            <p className="mono-12 mt-1.5 text-muted">
              {claim.claim_id} · {claim.method} · submitted {formatDate(claim.submitted_at)}
            </p>
          </div>
        </div>
        <StatusBadge status={claim.status} />
      </header>

      {error && <ErrorPanel message={error} onRetry={load} />}

      {verifying && <VerificationWait method={claim.method} />}

      {claim.status === "minting" && (
        <section className="panel p-6" role="status" aria-live="polite">
          <span className="t-label">Issuing credits</span>
          <p className="t-14 mt-2 text-secondary">
            Verification passed. The credits are being written to the ledger.
          </p>
        </section>
      )}

      {claim.status === "minted" && claim.verification && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="panel p-6 md:p-8"
          aria-label="Result"
        >
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <span className="t-label">Credits awarded</span>
              <div className="mono-64 mt-2 text-signal">
                <AnimatedNumber
                  value={claim.verification.credits ?? 0}
                  decimals={1}
                  durationMs={900}
                />
              </div>
              {category && (
                <p className="mono-12 mt-2 flex items-center gap-2 text-secondary">
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2"
                    style={{ background: CATEGORY_COLOR[category] }}
                  />
                  {category}
                </p>
              )}
            </div>
            {claim.verification.confidence != null && (
              <ConfidenceGauge value={claim.verification.confidence} />
            )}
          </div>
          {claim.tx_hash && (
            <div className="mt-6 border-t border-line pt-4">
              <span className="t-label">Ledger transaction</span>
              <div className="mt-2">
                <CopyableHash hash={claim.tx_hash} />
              </div>
            </div>
          )}
        </motion.section>
      )}

      {claim.status === "rejected" && (
        <section
          className="panel p-6"
          style={{ borderLeft: "2px solid var(--alert)" }}
          aria-label="Outcome"
        >
          <span className="t-label">Not verified</span>
          <p className="t-16 mt-2 text-primary">
            {claim.error ?? "The claim could not be verified."}
          </p>
          <p className="t-14 mt-2 text-secondary">
            Clearer evidence usually resolves it — a sharper scan, a wider radius, or a
            longer period between the before and after dates.
          </p>
          <Link href="/claims/new" className="mt-5 inline-block">
            <Button variant="secondary">Log another action</Button>
          </Link>
        </section>
      )}

      {claim.status === "mint_failed" && (
        <section
          className="panel p-6"
          style={{ borderLeft: "2px solid var(--ember)" }}
          aria-label="Outcome"
        >
          <span className="t-label">Verified — credits pending</span>
          <p className="t-16 mt-2 text-primary">
            This claim was verified
            {claim.verification?.credits
              ? ` for ${claim.verification.credits.toFixed(1)} credits`
              : ""}
            , but the ledger write did not complete. Verification does not need to run
            again — only the mint.
          </p>
          {claim.error && <p className="mono-12 mt-2 text-muted">{claim.error}</p>}
          <div className="mt-5">
            <Button onClick={doRetry} disabled={retrying}>
              {retrying ? "Retrying…" : "Retry issuing credits"}
            </Button>
          </div>
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
        <div className="flex min-w-0 flex-col gap-6">
          {claim.verification?.verified && (
            <section className="panel p-6" aria-label="Evidence">
              <span className="t-label">Evidence</span>
              <p className="mono-12 mt-1 text-muted">
                Returned by the verification pipeline. Fields vary by method.
              </p>
              <div className="mt-5">
                <EvidencePanel evidence={claim.verification.evidence} />
              </div>
            </section>
          )}

          {claim.file_name && (
            <section className="panel p-6" aria-label="Submitted file">
              <span className="t-label">Submitted file</span>
              <p className="mono-14 mt-2 break-all text-primary">{claim.file_name}</p>
            </section>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {isSatellite && (
            <section className="panel overflow-hidden" aria-label="Location">
              {!globeLost && (
                <Globe
                  lat={location!.lat}
                  lng={location!.lng}
                  radiusM={radiusM}
                  interactive={false}
                  onContextLost={() => setGlobeLost(true)}
                  className="h-48 w-full"
                />
              )}
              <div className="p-5">
                <span className="t-label">Parcel</span>
                <p className="mono-14 mt-2 text-primary">
                  {formatLatLng(location!.lat!, location!.lng!)}
                </p>
                <p className="mono-12 mt-1 text-muted">radius {formatRadius(radiusM)}</p>
                {claim.dates?.before && claim.dates?.after && (
                  <p className="mono-12 mt-1 text-muted">
                    {formatDate(claim.dates.before)} → {formatDate(claim.dates.after)}
                  </p>
                )}
              </div>
            </section>
          )}

          <section className="panel p-6" aria-label="Timeline">
            <span className="t-label">Timeline</span>
            <div className="mt-4">
              <Timeline claim={claim} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
