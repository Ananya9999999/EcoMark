"use client";

/** The claim list row, shared by the dashboard and the history page so the
 * two can never drift apart. */

import Link from "next/link";
import { motion } from "framer-motion";

import { actionLabel, type ClaimSummary } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { CategoryDot } from "@/components/primitives/CategoryDot";
import { StatusBadge } from "@/components/primitives/StatusBadge";

export function ClaimRow({ claim, index }: { claim: ClaimSummary; index: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 10) * 0.035, duration: 0.25 }}
    >
      <Link
        href={`/claims/${claim.claim_id}`}
        className="flex items-center justify-between gap-4 px-6 py-3.5 transition-colors hover:bg-[var(--graticule-dim)]"
      >
        <div className="min-w-0">
          <div className="truncate text-sm text-airglow">{actionLabel(claim.action_type)}</div>
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
          {/* credits appear only once actually minted — never for mint_failed */}
          {claim.credits_awarded != null && claim.status === "minted" && (
            <span className="type-mono-m text-airglow">
              +{claim.credits_awarded.toFixed(1)}
            </span>
          )}
          <StatusBadge status={claim.status} />
        </div>
      </Link>
    </motion.li>
  );
}
