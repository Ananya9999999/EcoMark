"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-signal text-void font-medium shadow-[0_0_0_0_rgba(110,231,168,0)] hover:brightness-110 hover:shadow-[0_8px_24px_-8px_rgba(110,231,168,0.55)] active:brightness-95 active:scale-[0.98] disabled:opacity-35",
  secondary:
    "border border-line bg-elevated text-primary hover:border-signal-dim hover:bg-[var(--signal-wash)] disabled:opacity-35 active:scale-[0.98]",
  ghost:
    "text-secondary hover:bg-[var(--muted-wash)] hover:text-primary disabled:opacity-35 active:scale-[0.98]",
  danger:
    "border border-[var(--alert)] bg-[var(--alert-wash)] text-[var(--alert)] hover:brightness-110 disabled:opacity-35 active:scale-[0.98]",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <button
      {...rest}
      className={`t-14 inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--r-row)] px-5 py-2.5 transition-[filter,border-color,background-color,box-shadow,transform] duration-[var(--d-quick)] ease-[var(--ease-out)] disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)] ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
