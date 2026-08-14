import type { CreditCategory } from "@/lib/types";

/** Category colours come from the data ramp and are bound to meaning only. */
export const CATEGORY_COLOR: Record<CreditCategory, string> = {
  land: "var(--chlorophyll)",
  energy: "var(--sodium)",
  water: "var(--bathymetry)",
  transport: "var(--nir-magenta)",
};

export function CategoryDot({ category }: { category: CreditCategory }) {
  return (
    <span
      aria-hidden
      className="inline-block h-2 w-2 rounded-full"
      style={{ background: CATEGORY_COLOR[category] }}
    />
  );
}
