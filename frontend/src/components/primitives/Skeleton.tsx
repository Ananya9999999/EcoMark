/** Skeletons matching the shape of the eventual content — not spinners (8.7). */

export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3" aria-hidden>
      <div className="flex flex-col gap-2">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton h-3 w-24" />
      </div>
      <div className="skeleton h-5 w-20" />
    </div>
  );
}

export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col divide-y divide-[var(--rule)]">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonBlock({ className = "h-24 w-full" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}
