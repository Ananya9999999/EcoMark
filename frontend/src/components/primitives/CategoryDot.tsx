import type { CreditCategory } from "@/lib/types";

/** Category colours are bound to meaning and identical everywhere. */
export const CATEGORY_COLOR: Record<CreditCategory, string> = {
  land: "var(--land)",
  energy: "var(--energy)",
  water: "var(--water)",
  transport: "var(--transport)",
};

export function CategoryDot({ category }: { category: CreditCategory }) {
  return (
    <span
      aria-hidden
      className="inline-block h-2 w-2 shrink-0"
      style={{ background: CATEGORY_COLOR[category] }}
    />
  );
}
