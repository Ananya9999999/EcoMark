"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, type ReactNode } from "react";

import { AppProvider, useApp } from "@/lib/app-context";
import { CATEGORIES } from "@/lib/types";
import { CategoryDot } from "./primitives/CategoryDot";
import { AnimatedNumber } from "./primitives/AnimatedNumber";
import { SkeletonBlock } from "./primitives/Skeleton";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/claims/new", label: "New claim" },
  { href: "/claims", label: "My claims" },
  { href: "/swaps", label: "Swaps" },
] as const;

function NavLinks({ horizontal = false }: { horizontal?: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className={horizontal ? "flex flex-row gap-1" : "flex flex-col gap-1"}
    >
      {NAV.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : item.href === "/claims"
              ? pathname === "/claims" || /^\/claims\/(?!new)/.test(pathname)
              : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-[var(--radius-row)] px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-[var(--limb-dim)] text-limb"
                : "text-graticule hover:bg-[var(--graticule-dim)] hover:text-airglow"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function RailBalance() {
  const { balance, balanceError, refreshBalance } = useApp();
  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <span className="type-label-xs">Balance</span>
      {balanceError ? (
        <button
          onClick={() => refreshBalance()}
          className="rounded-[var(--radius-row)] border border-[var(--rule)] px-2 py-1.5 text-left text-xs text-graticule hover:text-airglow"
        >
          Balance unavailable — retry
        </button>
      ) : balance == null ? (
        <div className="flex flex-col gap-1.5">
          {CATEGORIES.map((c) => (
            <SkeletonBlock key={c} className="h-4 w-full" />
          ))}
        </div>
      ) : (
        <dl className="flex flex-col gap-1">
          {CATEGORIES.map((cat) => (
            <div key={cat} className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 text-xs text-graticule">
                <CategoryDot category={cat} />
                {cat}
              </dt>
              <dd className="type-mono-s text-airglow">
                <AnimatedNumber value={balance.balances[cat] ?? 0} decimals={1} />
              </dd>
            </div>
          ))}
          <div className="mt-1 flex items-center justify-between gap-2 border-t border-[var(--rule)] pt-1.5">
            <dt className="text-xs text-graticule">total</dt>
            <dd className="type-mono-s font-medium text-limb">
              <AnimatedNumber value={balance.total} decimals={1} />
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}

function UserSwitcher() {
  const { users, currentUserId, switchUser } = useApp();
  // useId — the switcher is mounted twice (rail + mobile), so a fixed id
  // would be a duplicate in the DOM and label activation would misfire.
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="type-label-xs">
        Viewing as
      </label>
      <select
        id={id}
        value={currentUserId ?? ""}
        onChange={(e) => switchUser(e.target.value)}
        disabled={users.length === 0}
        className="w-full input-instrument disabled:opacity-50"
      >
        {users.length === 0 ? (
          <option value="">No users</option>
        ) : (
          users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))
        )}
      </select>
    </div>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-terrace focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <aside className="flex w-full shrink-0 flex-row items-center justify-between gap-4 border-b border-[var(--rule)] px-4 py-3 md:min-h-screen md:w-52 md:flex-col md:items-stretch md:justify-start md:border-b-0 md:border-r md:px-4 md:py-6">
        <Link href="/" className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-3.5 w-3.5 rounded-full border border-limb"
            style={{ boxShadow: "0 0 8px rgba(92, 200, 219, 0.6)" }}
          />
          <span className="font-display text-lg font-semibold tracking-tight">Orbit</span>
        </Link>
        <div className="hidden md:mt-6 md:block">
          <NavLinks />
        </div>
        <div className="hidden md:mt-8 md:block">
          <RailBalance />
        </div>
        <div className="mt-auto hidden md:block md:pt-8">
          <UserSwitcher />
        </div>
        {/* compact mobile controls */}
        <div className="md:hidden">
          <UserSwitcher />
        </div>
      </aside>
      {/* mobile nav bar */}
      <div className="sticky top-0 z-40 border-b border-[var(--rule)] bg-night-ocean/95 px-2 py-1 backdrop-blur md:hidden">
        <div className="flex flex-row gap-1 overflow-x-auto">
          <NavLinks horizontal />
        </div>
      </div>
      <main id="main" className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">
        {children}
      </main>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <ShellInner>{children}</ShellInner>
    </AppProvider>
  );
}
