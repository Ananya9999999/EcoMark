"use client";

/**
 * The readout bar (design.md §4) — deliberately not a sidebar-plus-topbar.
 * A thin instrument strip carries the wordmark, navigation as calibrated
 * tabs, the live total, and the session control.
 *
 * The landing and login screens render bare, without the bar.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { AppProvider, useApp } from "@/lib/app-context";
import { AnimatedNumber } from "./primitives/AnimatedNumber";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/claims/new", label: "Log action" },
  { href: "/claims", label: "Claims" },
  { href: "/swaps", label: "Trades" },
] as const;

const BARE_ROUTES = ["/", "/login"];

function Wordmark() {
  return (
    <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
      <span
        aria-hidden
        className="inline-block h-3 w-3 rotate-45 border border-signal"
        style={{ boxShadow: "0 0 10px rgba(110,231,168,0.55)" }}
      />
      <span
        className="font-display text-primary"
        style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em" }}
      >
        EcoMark
      </span>
    </Link>
  );
}

function NavTabs({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex items-center gap-1">
      {NAV.map((item) => {
        const active =
          item.href === "/claims"
            ? pathname === "/claims" || /^\/claims\/(?!new)/.test(pathname)
            : pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`t-14 relative whitespace-nowrap px-3 py-2 transition-colors ${
              active ? "text-signal" : "text-secondary hover:text-primary"
            }`}
          >
            {item.label}
            {active && (
              <span
                aria-hidden
                className="absolute inset-x-2 -bottom-px h-px bg-signal"
                style={{ boxShadow: "0 0 8px rgba(110,231,168,0.8)" }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SessionControl() {
  const { currentUser, logOut, balance } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!currentUser) return null;

  return (
    <div className="relative flex items-center gap-4">
      <div className="hidden items-baseline gap-2 sm:flex">
        <span className="mono-16 text-primary">
          {balance ? <AnimatedNumber value={balance.total} decimals={1} /> : "—"}
        </span>
        <span className="t-label" style={{ fontSize: 12 }}>
          credits
        </span>
      </div>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-[var(--r-instrument)] px-2 py-1.5 text-secondary transition-colors hover:text-primary"
      >
        <span
          aria-hidden
          className="mono-12 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-elevated text-signal"
        >
          {currentUser.name.charAt(0)}
        </span>
        <span className="t-14 hidden md:inline">{currentUser.name}</span>
        <span aria-hidden className="mono-12">
          ▾
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="panel-elevated absolute right-0 top-full z-50 mt-2 w-52 p-1"
          >
            <div className="border-b border-line px-3 py-2">
              <p className="t-14 text-primary">{currentUser.name}</p>
              <p className="mono-12 truncate text-muted" title={currentUser.wallet_address}>
                {currentUser.wallet_address.slice(0, 10)}…
                {currentUser.wallet_address.slice(-4)}
              </p>
            </div>
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                logOut();
                router.push("/login");
              }}
              className="t-14 w-full px-3 py-2 text-left text-secondary transition-colors hover:bg-[var(--muted-wash)] hover:text-primary"
            >
              Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNav, setMobileNav] = useState(false);

  if (BARE_ROUTES.includes(pathname)) return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-elevated focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-[color-mix(in_srgb,var(--bg-void)_88%,transparent)] backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-6">
            <Wordmark />
            <div className="hidden md:block">
              <NavTabs />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SessionControl />
            <button
              onClick={() => setMobileNav((v) => !v)}
              aria-expanded={mobileNav}
              aria-label="Menu"
              className="t-14 px-2 py-2 text-secondary md:hidden"
            >
              <span aria-hidden>{mobileNav ? "✕" : "☰"}</span>
            </button>
          </div>
        </div>
        {mobileNav && (
          <div className="border-t border-line px-4 py-2 md:hidden">
            <div className="flex flex-col items-start">
              <NavTabs onNavigate={() => setMobileNav(false)} />
            </div>
          </div>
        )}
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6 md:py-10">
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
