"use client";

/**
 * App frame: a fixed left sidebar carrying the wordmark, navigation and
 * the session control, with a compact top bar standing in for it on
 * mobile. Content scrolls independently of the sidebar.
 *
 * The landing and login screens render bare, without the bar.
 */

import Image from "next/image";
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
      <Image
        src="/mark.png"
        alt=""
        width={28}
        height={28}
        priority
        className="h-7 w-7 shrink-0"
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

function NavTabs({
  onNavigate,
  vertical = false,
}: {
  onNavigate?: () => void;
  vertical?: boolean;
}) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className={vertical ? "flex flex-col gap-0.5" : "flex items-center gap-1"}
    >
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
            className={`t-14 relative whitespace-nowrap transition-colors ${
              vertical ? "rounded-[var(--r-row)] px-3 py-2.5" : "px-3 py-2"
            } ${
              active
                ? vertical
                  ? "bg-[var(--signal-wash)] text-signal"
                  : "text-signal"
                : "text-secondary hover:bg-[var(--muted-wash)] hover:text-primary"
            }`}
          >
            {item.label}
            {active && (
              <span
                aria-hidden
                className={
                  vertical
                    ? "absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-signal"
                    : "absolute inset-x-2 -bottom-px h-px bg-signal"
                }
                style={{ boxShadow: "0 0 8px rgba(110,231,168,0.8)" }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SessionControl({ stacked = false }: { stacked?: boolean }) {
  const { currentUser, logOut, balance } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!currentUser) return null;

  return (
    <div
      className={
        stacked ? "relative flex flex-col gap-3" : "relative flex items-center gap-4"
      }
    >
      <div
        className={
          stacked
            ? "flex items-baseline gap-2 px-3"
            : "hidden items-baseline gap-2 sm:flex"
        }
      >
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
        aria-label={`Account menu for ${currentUser.name}`}
        className={`flex items-center gap-2 rounded-[var(--r-row)] px-3 py-2 text-secondary transition-colors hover:bg-[var(--muted-wash)] hover:text-primary ${
          stacked ? "w-full" : ""
        }`}
      >
        <span
          aria-hidden
          className="mono-12 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-elevated text-signal"
        >
          {currentUser.name.charAt(0)}
        </span>
        <span className={`t-14 ${stacked ? "flex-1 text-left" : "hidden md:inline"}`}>
          {currentUser.name}
        </span>
        <span aria-hidden className="mono-12">
          ▾
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
          <div
            role="menu"
            className={`panel-elevated absolute z-50 w-52 p-1 ${
              stacked ? "bottom-full left-0 mb-2" : "right-0 top-full mt-2"
            }`}
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
    <div className="flex min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-elevated focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      {/* ---- sidebar: fixed, scrolls independently of the page ---- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-line bg-surface px-4 py-5 md:flex">
        <Wordmark />
        <div className="mt-7">
          <span className="t-label mb-2 block px-3" style={{ fontSize: 12 }}>
            Menu
          </span>
          <NavTabs vertical />
        </div>
        <div className="mt-auto pt-6">
          <SessionControl stacked />
        </div>
      </aside>

      {/* ---- mobile top bar ---- */}
      <header className="fixed inset-x-0 top-0 z-30 border-b border-line bg-[color-mix(in_srgb,var(--bg-void)_92%,transparent)] backdrop-blur md:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Wordmark />
          <button
            onClick={() => setMobileNav((v) => !v)}
            aria-expanded={mobileNav}
            aria-label="Menu"
            className="t-14 px-2 py-2 text-secondary"
          >
            <span aria-hidden>{mobileNav ? "✕" : "☰"}</span>
          </button>
        </div>
        {mobileNav && (
          <div className="border-t border-line px-3 py-3">
            <NavTabs vertical onNavigate={() => setMobileNav(false)} />
            <div className="mt-3 border-t border-line pt-3">
              <SessionControl stacked />
            </div>
          </div>
        )}
      </header>

      <main
        id="main"
        className="min-w-0 flex-1 px-4 pb-16 pt-20 md:ml-56 md:px-8 md:pb-20 md:pt-10 lg:px-12"
      >
        <div className="mx-auto w-full max-w-5xl">{children}</div>
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
