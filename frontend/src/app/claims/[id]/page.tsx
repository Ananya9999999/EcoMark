"use client";

/**
 * Claim detail (8.5): header, result, generic evidence panel, mini globe for
 * satellite claims, timeline, retry for mint_failed, calm rejection.
 * Polls every 2 seconds while the status is non-terminal (8.3 step 4).
 */

import dynamic from "next/dynamic";
import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import { getClaim, messageFrom, retryMint } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { usePolling } from "@/lib/usePolling";
import {
  actionLabel,
  isTerminal,
  type ClaimDetail,
} from "@/lib/types";
import { formatDate, formatDateTime, formatLatLng, formatRadius, shortHash } from "@/lib/format";
import { Button } from "@/components/primitives/Button";
import { ErrorPanel } from "@/components/primitives/ErrorPanel";
import { SkeletonBlock } from "@/components/primitives/Skeleton";
import { StatusBadge } from "@/components/primitives/StatusBadge";
import { AnimatedNumber } from "@/components/primitives/AnimatedNumber";
import { CategoryDot } from "@/components/primitives/CategoryDot";
import { EvidencePanel } from "@/components/claims/EvidencePanel";
import { VerificationWait } from "@/components/claims/VerificationWait";

const Globe = dynamic(() => import("@/components/globe/Globe"), { ssr: false });

function Timeline({ claim }: { claim: ClaimDetail }) {
  const events: { label: string; at: string | null }[] = [
    { label: "Submitted", at: claim.submitted_at },
  ];
  if (claim.verified_at) {
    events.push({
      label: claim.status === "rejected" ? "Verification completed" : "Verified",
      at: claim.verified_at,
    });
  }
  if (claim.status === "minted") events.push({ label: "Credits minted", at: null });
  if (claim.status === "mint_failed") events.push({ label: "Minting failed", at: null });

  return (
    <ol className="flex flex-col gap-2">
      {events.map((e) => (
        <li key={e.label} className="flex items-baseline justify-between gap-4">
          <span className="text-sm text-airglow">{e.label}</span>
          <span className="type-mono-s text-graticule">
            {e.at ? formatDateTime(e.at) : "—"}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function ClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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
      // Refresh the rail balance the moment a poll observes the mint.
      if (wasNonTerminal.current && data.status === "minted") {
        refreshBalance();
      }
      wasNonTerminal.current = !isTerminal(data.status);
    } catch (e) {
      setError(messageFrom(e, "The claim could not be loaded"));
    }
  }, [id, refreshBalance]);

  useEffect(() => {
    // Clear first: on a user switch the previous user's claim must not stay
    // on screen underneath a "not found" error.
    setClaim(null);
    setError(null);
    load();
  }, [load, currentUserId]);

  // Poll every 2s while non-terminal; stop on terminal; clean up on unmount.
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
        <SkeletonBlock className="h-10 w-64" />
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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="type-display-l">{actionLabel(claim.action_type)}</h1>
          <p className="type-mono-s mt-1 text-graticule">
            {claim.claim_id} · submitted {formatDate(claim.submitted_at)}
          </p>
        </div>
        <StatusBadge status={claim.status} />
      </header>

      {/* Errors after the claim has loaded (a failed retry, a failed poll)
          must stay visible, not be silently swallowed. */}
      {error && <ErrorPanel message={error} onRetry={load} />}

      {/* The verification wait — the emotional core */}
      {verifying && <VerificationWait method={claim.method} />}

      {/* Minting in progress */}
      {claim.status === "minting" && (
        <div className="surface-shelf p-6" role="status">
          <span className="type-label-xs mb-2 block">Issuing credits</span>
          <p className="text-sm text-graticule">
            Verification passed. The credits are being minted to your wallet.
          </p>
        </div>
      )}

      {/* Result */}
      {claim.status === "minted" && claim.verification && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-shelf p-6"
          aria-label="Result"
        >
          <span className="type-label-xs mb-3 block">Credits awarded</span>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <span className="type-mono-l text-chlorophyll" style={{ fontSize: "2.5rem" }}>
              +<AnimatedNumber value={claim.verification.credits ?? 0} decimals={1} durationMs={900} />
            </span>
            {claim.verification.category && (
              <span className="flex items-center gap-1.5 text-sm text-airglow">
                <CategoryDot category={claim.verification.category} />
                {claim.verification.category}
              </span>
            )}
            {claim.verification.confidence != null && (
              <span className="type-mono-s text-graticule">
                confidence {(claim.verification.confidence * 100).toFixed(0)}%
              </span>
            )}
          </div>
          {claim.tx_hash && (
            <p className="type-mono-s mt-3 text-graticule" title={claim.tx_hash}>
              tx {shortHash(claim.tx_hash)}
            </p>
          )}
        </motion.section>
      )}

      {/* Rejection — calm, clear, with a next step */}
      {claim.status === "rejected" && (
        <section className="surface-shelf border-l-2 border-l-oxide p-6" aria-label="Outcome">
          <span className="type-label-xs mb-2 block">Not verified</span>
          <p className="text-sm text-airglow">
            {claim.error ?? "The claim could not be verified."}
          </p>
          <p className="mt-2 text-sm text-graticule">
            If you have clearer evidence — a better document, a more precise location —
            a new claim can use it.
          </p>
          <Link href="/claims/new" className="mt-4 inline-block">
            <Button variant="secondary">Make another claim</Button>
          </Link>
        </section>
      )}

      {/* Mint failed — verified, retryable */}
      {claim.status === "mint_failed" && (
        <section className="surface-shelf border-l-2 border-l-sodium p-6" aria-label="Outcome">
          <span className="type-label-xs mb-2 block">Verified — credits pending</span>
          <p className="text-sm text-airglow">
            The claim was verified{claim.verification?.credits ? ` for ${claim.verification.credits.toFixed(1)} credits` : ""},
            but the credits could not be issued yet.
          </p>
          {claim.error && <p className="type-mono-s mt-2 text-graticule">{claim.error}</p>}
          <div className="mt-4">
            <Button onClick={doRetry} disabled={retrying}>
              {retrying ? "Retrying…" : "Retry issuing credits"}
            </Button>
          </div>
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-[1.6fr_1fr]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Evidence */}
          {claim.verification && claim.verification.verified && (
            <section className="surface-shelf p-6" aria-label="Evidence">
              <span className="type-label-xs mb-4 block">Evidence</span>
              <EvidencePanel evidence={claim.verification.evidence} />
            </section>
          )}

          {/* File claims */}
          {claim.file_name && (
            <section className="surface-shelf p-6" aria-label="Submitted file">
              <span className="type-label-xs mb-2 block">Submitted file</span>
              <p className="type-mono-m text-airglow">{claim.file_name}</p>
            </section>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {/* Location — the mini globe (7.5.2) */}
          {isSatellite && (
            <section className="surface-shelf overflow-hidden p-0" aria-label="Location">
              {!globeLost && (
                <Globe
                  lat={location!.lat}
                  lng={location!.lng}
                  radiusM={radiusM}
                  interactive={false}
                  onContextLost={() => setGlobeLost(true)}
                  className="h-52 w-full"
                />
              )}
              <div className="px-5 pb-4 pt-1">
                <p className="type-mono-s text-airglow">
                  {formatLatLng(location!.lat!, location!.lng!)}
                </p>
                <p className="type-mono-s mt-0.5 text-graticule">
                  radius {formatRadius(radiusM)}
                  {claim.dates?.before && claim.dates?.after && (
                    <> · {formatDate(claim.dates.before)} → {formatDate(claim.dates.after)}</>
                  )}
                </p>
              </div>
            </section>
          )}

          {/* Timeline */}
          <section className="surface-shelf p-6" aria-label="Timeline">
            <span className="type-label-xs mb-3 block">Timeline</span>
            <Timeline claim={claim} />
          </section>
        </div>
      </div>
    </div>
  );
}
