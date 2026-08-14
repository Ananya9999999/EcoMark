"use client";

/**
 * The three-dot filter menu: multi-select across status, category and
 * method, plus sort. Selections show as removable chips beside it.
 */

import { useEffect, useRef, useState } from "react";

import {
  CATEGORIES,
  CLAIM_STATUSES,
  METHODS,
  type ClaimStatus,
  type CreditCategory,
  type VerificationMethod,
} from "@/lib/types";
import { CATEGORY_COLOR } from "@/components/primitives/CategoryDot";

export type SortKey = "newest" | "oldest" | "credits" | "action";

export interface Filters {
  statuses: ClaimStatus[];
  categories: CreditCategory[];
  methods: VerificationMethod[];
  sort: SortKey;
}

export const EMPTY_FILTERS: Filters = {
  statuses: [],
  categories: [],
  methods: [],
  sort: "newest",
};

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "credits", label: "Most credits" },
  { key: "action", label: "Action type" },
];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function activeCount(f: Filters): number {
  return f.statuses.length + f.categories.length + f.methods.length;
}

function Group<T extends string>({
  label,
  options,
  selected,
  onToggle,
  swatch,
}: {
  label: string;
  options: readonly T[];
  selected: T[];
  onToggle: (v: T) => void;
  swatch?: (v: T) => string;
}) {
  return (
    <div className="border-b border-line px-3 py-3 last:border-b-0">
      <span className="t-label" style={{ fontSize: 12 }}>
        {label}
      </span>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <button
              key={o}
              role="checkbox"
              aria-checked={on}
              onClick={() => onToggle(o)}
              className={`mono-12 flex items-center gap-1.5 rounded-[var(--r-instrument)] border px-2 py-1 transition-colors ${
                on
                  ? "border-signal bg-[var(--signal-wash)] text-signal"
                  : "border-line text-secondary hover:text-primary"
              }`}
            >
              {swatch && (
                <span
                  aria-hidden
                  className="inline-block h-2 w-2"
                  style={{ background: swatch(o) }}
                />
              )}
              {o.replace("_", " ")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FilterMenu({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const count = activeCount(filters);

  return (
    <div ref={wrap} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Filter and sort"
        className={`flex items-center gap-2 rounded-[var(--r-instrument)] border px-2.5 py-1.5 transition-colors ${
          count > 0 || open
            ? "border-signal text-signal"
            : "border-line text-secondary hover:text-primary"
        }`}
      >
        <span aria-hidden className="mono-14 leading-none">
          ⋯
        </span>
        <span className="t-12">Filter</span>
        {count > 0 && (
          <span className="mono-12 rounded-full bg-[var(--signal-wash)] px-1.5">{count}</span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="panel-elevated absolute right-0 top-full z-40 mt-2 w-72 overflow-hidden"
        >
          <Group
            label="Status"
            options={CLAIM_STATUSES}
            selected={filters.statuses}
            onToggle={(v) => onChange({ ...filters, statuses: toggle(filters.statuses, v) })}
          />
          <Group
            label="Category"
            options={CATEGORIES}
            selected={filters.categories}
            onToggle={(v) => onChange({ ...filters, categories: toggle(filters.categories, v) })}
            swatch={(v) => CATEGORY_COLOR[v]}
          />
          <Group
            label="Method"
            options={METHODS}
            selected={filters.methods}
            onToggle={(v) => onChange({ ...filters, methods: toggle(filters.methods, v) })}
          />
          <div className="px-3 py-3">
            <label htmlFor="sort" className="t-label" style={{ fontSize: 12 }}>
              Sort
            </label>
            <select
              id="sort"
              value={filters.sort}
              onChange={(e) => onChange({ ...filters, sort: e.target.value as SortKey })}
              className="field t-14 mt-2 w-full"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          {count > 0 && (
            <div className="border-t border-line p-2">
              <button
                onClick={() => onChange({ ...EMPTY_FILTERS, sort: filters.sort })}
                className="t-14 w-full px-2 py-1.5 text-left text-secondary hover:text-primary"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Removable chips for whatever is currently applied. */
export function FilterChips({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const chips: { key: string; label: string; remove: () => void }[] = [
    ...filters.statuses.map((s) => ({
      key: `s-${s}`,
      label: s.replace("_", " "),
      remove: () =>
        onChange({ ...filters, statuses: filters.statuses.filter((v) => v !== s) }),
    })),
    ...filters.categories.map((c) => ({
      key: `c-${c}`,
      label: c,
      remove: () =>
        onChange({ ...filters, categories: filters.categories.filter((v) => v !== c) }),
    })),
    ...filters.methods.map((m) => ({
      key: `m-${m}`,
      label: m,
      remove: () => onChange({ ...filters, methods: filters.methods.filter((v) => v !== m) }),
    })),
  ];

  if (chips.length === 0) return null;

  return (
    <ul className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            onClick={chip.remove}
            aria-label={`Remove ${chip.label} filter`}
            className="mono-12 flex items-center gap-1.5 rounded-[var(--r-instrument)] border border-line px-2 py-1 text-secondary transition-colors hover:border-signal hover:text-signal"
          >
            {chip.label}
            <span aria-hidden>✕</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
