"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-signal text-void font-medium hover:brightness-110 active:brightness-95 disabled:opacity-35",
  secondary:
    "border border-line bg-elevated text-primary hover:border-signal-dim disabled:opacity-35",
  ghost: "text-secondary hover:bg-[var(--muted-wash)] hover:text-primary disabled:opacity-35",
  danger:
    "border border-[var(--alert)] bg-[var(--alert-wash)] text-[var(--alert)] hover:brightness-110 disabled:opacity-35",
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
      className={`t-14 inline-flex items-center justify-center gap-2 rounded-[var(--r-row)] px-4 py-2.5 transition-[filter,border-color,background-color] duration-[var(--d-quick)] disabled:pointer-events-none ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
