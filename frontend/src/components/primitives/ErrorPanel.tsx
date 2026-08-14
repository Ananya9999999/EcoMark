"use client";

import { Button } from "./Button";

/** What happened, what to do, and a retry control (8.7). */
export function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="surface-shelf flex flex-col items-start gap-3 border-l-2 border-l-oxide p-5"
    >
      <p className="text-sm text-airglow">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
