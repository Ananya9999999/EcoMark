import type { ReactNode } from "react";

/** Invites the action that creates the missing content (§8.6, §12.1). */
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
    <div className="panel flex flex-col items-start gap-2 p-8">
      <h3 className="t-20 text-primary">{title}</h3>
      <p className="t-14 max-w-md text-secondary">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
