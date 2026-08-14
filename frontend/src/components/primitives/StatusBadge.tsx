import type { ClaimStatus, SwapStatus } from "@/lib/types";

/**
 * All seven claim states, each distinct at a glance. Never colour alone —
 * every badge carries text and a drawn glyph whose fill encodes progress
 * (§12.3: no information by colour alone).
 */
const CLAIM_STYLES: Record<
  ClaimStatus,
  { label: string; glyph: string; color: string; wash: string; pulse?: boolean }
> = {
  submitted: {
    label: "Submitted",
    glyph: "○",
    color: "var(--text-secondary)",
    wash: "var(--muted-wash)",
  },
  verifying: {
    label: "Verifying",
    glyph: "◐",
    color: "var(--signal)",
    wash: "var(--signal-wash)",
    pulse: true,
  },
  verified: {
    label: "Verified",
    glyph: "◉",
    color: "var(--signal)",
    wash: "var(--signal-wash)",
  },
  minting: {
    label: "Minting",
    glyph: "◑",
    color: "var(--ember)",
    wash: "var(--ember-wash)",
    pulse: true,
  },
  minted: {
    label: "Minted",
    glyph: "●",
    color: "var(--signal)",
    wash: "var(--signal-wash)",
  },
  rejected: {
    label: "Rejected",
    glyph: "⊘",
    color: "var(--alert)",
    wash: "var(--alert-wash)",
  },
  mint_failed: {
    label: "Mint failed",
    glyph: "◍",
    color: "var(--ember)",
    wash: "var(--ember-wash)",
  },
};

export function StatusBadge({ status }: { status: ClaimStatus }) {
  const s = CLAIM_STYLES[status];
  return (
    <span
      className="mono-12 inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--r-instrument)] px-2 py-1"
      style={{ color: s.color, background: s.wash }}
    >
      <span aria-hidden className={s.pulse ? "animate-pulse" : undefined}>
        {s.glyph}
      </span>
      {s.label}
    </span>
  );
}

const SWAP_STYLES: Record<SwapStatus, { label: string; color: string; wash: string }> = {
  pending: { label: "Awaiting reply", color: "var(--ember)", wash: "var(--ember-wash)" },
  accepted: { label: "Accepted", color: "var(--signal)", wash: "var(--signal-wash)" },
  rejected: { label: "Declined", color: "var(--text-secondary)", wash: "var(--muted-wash)" },
  failed: { label: "Failed", color: "var(--alert)", wash: "var(--alert-wash)" },
};

export function SwapStatusBadge({ status }: { status: SwapStatus }) {
  const s = SWAP_STYLES[status];
  return (
    <span
      className="mono-12 inline-flex items-center whitespace-nowrap rounded-[var(--r-instrument)] px-2 py-1"
      style={{ color: s.color, background: s.wash }}
    >
      {s.label}
    </span>
  );
}
