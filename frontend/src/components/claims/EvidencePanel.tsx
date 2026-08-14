/**
 * Renders the verification evidence dict generically (8.5). The owning
 * group will change its keys — iterate them, never hardcode field names.
 */

import { formatEvidenceValue, humaniseKey } from "@/lib/format";

function isImageUrl(key: string, value: unknown): value is string {
  return (
    key.endsWith("_url") &&
    typeof value === "string" &&
    /\.(png|jpe?g|gif|webp)(\?|$)/i.test(value)
  );
}

export function EvidencePanel({ evidence }: { evidence: Record<string, unknown> }) {
  const entries = Object.entries(evidence);
  if (entries.length === 0) {
    return <p className="text-sm text-graticule">No evidence was attached.</p>;
  }

  // A before/after image pair gets shown side by side.
  const beforeUrl = evidence["image_before_url"];
  const afterUrl = evidence["image_after_url"];
  const hasPair =
    isImageUrl("image_before_url", beforeUrl) && isImageUrl("image_after_url", afterUrl);

  const imageEntries = entries.filter(
    ([k, v]) => isImageUrl(k, v) && (!hasPair || (k !== "image_before_url" && k !== "image_after_url")),
  );
  const scalarEntries = entries.filter(([k, v]) => !isImageUrl(k, v));

  return (
    <div className="flex flex-col gap-4">
      {hasPair && (
        <div className="grid grid-cols-2 gap-3">
          {[
            ["Before", beforeUrl as string],
            ["After", afterUrl as string],
          ].map(([label, url]) => (
            <figure key={label} className="flex flex-col gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`${label} imagery`}
                className="w-full rounded-[var(--radius-row)] border border-[var(--rule)]"
              />
              <figcaption className="type-label-xs">{label}</figcaption>
            </figure>
          ))}
        </div>
      )}
      {imageEntries.map(([key, value]) => (
        <figure key={key} className="flex flex-col gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value as string}
            alt={humaniseKey(key)}
            className="w-full rounded-[var(--radius-row)] border border-[var(--rule)]"
          />
          <figcaption className="type-label-xs">{humaniseKey(key)}</figcaption>
        </figure>
      ))}
      {scalarEntries.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {scalarEntries.map(([key, value]) => (
            <div key={key} className="min-w-0">
              <dt className="type-label-xs truncate" title={humaniseKey(key)}>
                {humaniseKey(key)}
              </dt>
              <dd
                className={`mt-0.5 break-words text-airglow ${
                  typeof value === "number" ? "type-mono-m" : "text-sm"
                }`}
              >
                {formatEvidenceValue(value)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
