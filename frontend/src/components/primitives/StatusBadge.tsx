import type { ClaimStatus, SwapStatus } from "@/lib/types";

/**
 * All seven claim states, each distinct at a glance from two metres:
 * a drawn glyph (fill state) + colour + label, never colour alone.
 */
const CLAIM_STYLES: Record<
  ClaimStatus,
  { label: string; glyph: string; color: string; bg: string; pulse?: boolean }
> = {
  submitted: {
    label: "Submitted",
    glyph: "◦",
    color: "var(--graticule)",
    bg: "var(--graticule-dim)",
  },
  verifying: {
    label: "Verifying",
    glyph: "◐",
    color: "var(--limb)",
    bg: "var(--limb-dim)",
    pulse: true,
  },
  verified: {
    label: "Verified",
    glyph: "◉",
    color: "var(--limb)",
    bg: "var(--limb-dim)",
  },
  rejected: {
    label: "Rejected",
    glyph: "○",
    color: "var(--oxide)",
    bg: "var(--oxide-dim)",
  },
  minting: {
    label: "Minting",
    glyph: "◑",
    color: "var(--sodium)",
    bg: "var(--sodium-dim)",
    pulse: true,
  },
  minted: {
    label: "Minted",
    glyph: "●",
    color: "var(--chlorophyll)",
    bg: "var(--chlorophyll-dim)",
  },
  mint_failed: {
    label: "Mint failed",
    glyph: "◍",
    color: "var(--oxide)",
    bg: "var(--oxide-dim)",
  },
};

export function StatusBadge({ status }: { status: ClaimStatus }) {
  const s = CLAIM_STYLES[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[var(--radius-instrument)] px-2 py-0.5 text-xs font-semibold tracking-wide"
      style={{ color: s.color, background: s.bg }}
    >
      <span aria-hidden className={s.pulse ? "animate-pulse" : undefined}>
        {s.glyph}
      </span>
      {s.label}
    </span>
  );
}

const SWAP_STYLES: Record<SwapStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "var(--limb)", bg: "var(--limb-dim)" },
  accepted: { label: "Accepted", color: "var(--chlorophyll)", bg: "var(--chlorophyll-dim)" },
  rejected: { label: "Rejected", color: "var(--graticule)", bg: "var(--graticule-dim)" },
  failed: { label: "Failed", color: "var(--oxide)", bg: "var(--oxide-dim)" },
};

export function SwapStatusBadge({ status }: { status: SwapStatus }) {
  const s = SWAP_STYLES[status];
  return (
    <span
      className="inline-flex items-center rounded-[var(--radius-instrument)] px-2 py-0.5 text-xs font-semibold tracking-wide"
      style={{ color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  );
}
