"use client";

import { Button } from "./Button";

/** What happened, what to do, and a retry control (§12.1). */
export function ErrorPanel({
  message,
  onRetry,
  retryLabel = "Try again",
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-[var(--r-panel)] border border-line bg-surface p-5"
      style={{ borderLeft: "2px solid var(--alert)" }}
    >
      <p className="t-14 text-primary">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
