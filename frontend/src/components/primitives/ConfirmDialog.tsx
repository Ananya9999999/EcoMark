"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "./Button";

/** Native <dialog> — focus trapping, Esc and the backdrop come for free. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onCancel();
      }}
      className="m-auto w-full max-w-md bg-transparent p-4 backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="panel-elevated rounded-[var(--r-panel)] p-6">
        <h2 className="t-20 mb-3 text-primary">{title}</h2>
        <div className="t-14 mb-6 text-secondary">{children}</div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
