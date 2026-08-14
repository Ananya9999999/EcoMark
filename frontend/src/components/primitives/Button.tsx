"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-limb text-night-ocean font-semibold hover:brightness-110 active:brightness-95 disabled:opacity-40",
  secondary:
    "bg-terrace text-airglow border border-[var(--rule-strong)] hover:brightness-110 disabled:opacity-40",
  ghost: "text-graticule hover:text-airglow hover:bg-[var(--graticule-dim)] disabled:opacity-40",
  danger:
    "bg-[var(--oxide-dim)] text-oxide border border-[var(--oxide)] hover:brightness-110 disabled:opacity-40",
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
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-row)] px-4 py-2 text-sm transition-[filter,transform] duration-150 hover:-translate-y-px active:translate-y-0 disabled:pointer-events-none ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
