"use client";

/**
 * Renders the verification evidence generically (§7.6). Pair A will change
 * their fields — iterate the keys, never hardcode names.
 *
 * Any key ending in _url that points at an image becomes an image; a
 * before/after pair gets a draggable comparison divider.
 */

import { useRef, useState } from "react";

import { formatEvidenceValue, humaniseKey } from "@/lib/format";

function isImageUrl(key: string, value: unknown): value is string {
  return (
    key.endsWith("_url") &&
    typeof value === "string" &&
    /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(value)
  );
}

/** Before/after wipe — the most persuasive content, so it gets the interaction. */
function BeforeAfter({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(50);
  const frame = useRef<HTMLDivElement>(null);

  const setFromClientX = (clientX: number) => {
    const box = frame.current?.getBoundingClientRect();
    if (!box) return;
    setPos(Math.max(0, Math.min(100, ((clientX - box.left) / box.width) * 100)));
  };

  return (
    <figure className="flex flex-col gap-2">
      <div
        ref={frame}
        className="relative select-none overflow-hidden rounded-[var(--r-row)] border border-line"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setFromClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) setFromClientX(e.clientX);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={after} alt="After" className="block w-full" draggable={false} />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={before} alt="Before" className="block w-full" draggable={false} />
        </div>
        {/* the divider */}
        <div
          className="pointer-events-none absolute inset-y-0 w-px bg-signal"
          style={{ left: `${pos}%`, boxShadow: "0 0 10px rgba(110,231,168,0.8)" }}
        >
          <span className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-signal bg-void">
            <span className="mono-12 text-signal">↔</span>
          </span>
        </div>
        <span className="t-label absolute bottom-2 left-2" style={{ fontSize: 12 }}>
          Before
        </span>
        <span className="t-label absolute bottom-2 right-2" style={{ fontSize: 12 }}>
          After
        </span>
      </div>
      <label className="sr-only" htmlFor="wipe">
        Comparison position
      </label>
      <input
        id="wipe"
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="accent-signal"
      />
      <figcaption className="mono-12 text-muted">
        Drag to compare the imagery before and after.
      </figcaption>
    </figure>
  );
}

export function EvidencePanel({ evidence }: { evidence: Record<string, unknown> }) {
  const entries = Object.entries(evidence);
  if (entries.length === 0) {
    return <p className="t-14 text-secondary">No evidence was attached.</p>;
  }

  const before = evidence["image_before_url"];
  const after = evidence["image_after_url"];
  const hasPair = isImageUrl("image_before_url", before) && isImageUrl("image_after_url", after);

  const images = entries.filter(
    ([k, v]) =>
      isImageUrl(k, v) && !(hasPair && (k === "image_before_url" || k === "image_after_url")),
  );
  const scalars = entries.filter(([k, v]) => !isImageUrl(k, v));

  return (
    <div className="flex flex-col gap-5">
      {hasPair && <BeforeAfter before={before as string} after={after as string} />}

      {images.map(([key, value]) => (
        <figure key={key} className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value as string}
            alt={humaniseKey(key)}
            className="w-full rounded-[var(--r-row)] border border-line"
          />
          <figcaption className="t-label">{humaniseKey(key)}</figcaption>
        </figure>
      ))}

      {scalars.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          {scalars.map(([key, value]) => (
            <div key={key} className="min-w-0">
              <dt className="t-label truncate" title={humaniseKey(key)}>
                {humaniseKey(key)}
              </dt>
              <dd
                className={`mt-1 break-words text-primary ${
                  typeof value === "number" ? "mono-16" : "t-14"
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
