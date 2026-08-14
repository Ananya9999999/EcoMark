"use client";

/** One claim row, shared by the dashboard and the claims list. */

import Link from "next/link";
import { motion } from "framer-motion";

import { actionLabel, type ClaimSummary } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { CATEGORY_VAR } from "@/components/BalanceInstrument";
import { StatusBadge } from "@/components/primitives/StatusBadge";

export function ClaimRow({
  claim,
  index,
  animate = true,
}: {
  claim: ClaimSummary;
  index: number;
  animate?: boolean;
}) {
  return (
    <motion.li
      initial={animate ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 10) * 0.04, duration: 0.28 }}
      className="border-b border-line last:border-b-0"
    >
      <Link
        href={`/claims/${claim.claim_id}`}
        className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-[var(--muted-wash)]"
      >
        {/* category spine — colour identical to its balance segment */}
        <span
          aria-hidden
          className="h-8 w-0.5 shrink-0"
          style={{
            background: claim.category ? CATEGORY_VAR[claim.category] : "var(--line)",
          }}
        />
        <span className="min-w-0 flex-1">
          <span className="t-14 block truncate text-primary">
            {actionLabel(claim.action_type)}
          </span>
          <span className="mono-12 mt-0.5 block truncate text-muted">
            {formatDateTime(claim.submitted_at)}
            {claim.category ? ` · ${claim.category}` : ""}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {claim.credits_awarded != null && claim.status === "minted" && (
            <span className="mono-14 text-signal">
              +{claim.credits_awarded.toFixed(1)}
            </span>
          )}
          <StatusBadge status={claim.status} />
        </span>
      </Link>
    </motion.li>
  );
}
