import type { ReactNode } from "react";

/** Invites the action that creates the missing content (7.8, 8.7). */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface-shelf flex flex-col items-start gap-2 p-8">
      <h3 className="type-display-m">{title}</h3>
      <p className="max-w-md text-sm text-graticule">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
