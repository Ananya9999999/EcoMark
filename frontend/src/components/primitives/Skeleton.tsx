/** Skeletons match the shape of the eventual content — never a spinner (§12.1). */

export function SkeletonRow() {
  return (
    <div
      className="flex items-center justify-between gap-4 border-b border-line px-6 py-4"
      aria-hidden
    >
      <div className="flex flex-col gap-2">
        <div className="skeleton h-4 w-44" />
        <div className="skeleton h-3 w-28" />
      </div>
      <div className="skeleton h-6 w-24" />
    </div>
  );
}

export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col border-t border-line">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonBlock({ className = "h-24 w-full" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}
