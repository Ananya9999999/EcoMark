"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "./Button";

const MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_EXT = new Set(["jpg", "jpeg", "png"]);

/** Accepted extensions differ by method (§6): OCR reads documents, GPS reads logs. */
export const ACCEPT_BY_METHOD = {
  ocr: [".jpg", ".jpeg", ".png", ".pdf"],
  gps: [".gpx", ".json", ".csv"],
} as const;

function extensionOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function FileDropZone({
  file,
  accept,
  hint,
  reads,
  onChange,
  onError,
}: {
  file: File | null;
  /** Extensions this claim accepts, e.g. [".pdf", ".png"] */
  accept: readonly string[];
  /** One line describing the document expected. */
  hint: string;
  /** Fields the pipeline will read off it — makes each action distinguishable. */
  reads?: string[];
  onChange: (file: File | null) => void;
  onError: (message: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file && IMAGE_EXT.has(extensionOf(file.name))) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [file]);

  const allowed = new Set(accept.map((a) => a.replace(".", "")));
  const readable = accept.map((a) => a.replace(".", "").toUpperCase()).join(", ");

  const take = useCallback(
    (candidate: File) => {
      if (!allowed.has(extensionOf(candidate.name))) {
        onError(`This claim accepts ${readable} files.`);
        return;
      }
      if (candidate.size > MAX_BYTES) {
        onError("That file is over 10 MB. Try a smaller scan or a compressed export.");
        return;
      }
      onError(null);
      onChange(candidate);
    },
    [allowed, readable, onChange, onError],
  );

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      accept={accept.join(",")}
      aria-label="Choose a file"
      className="sr-only"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) take(f);
        e.target.value = "";
      }}
    />
  );

  if (file) {
    return (
      <div className="panel-elevated flex items-center gap-4 p-4">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={`Preview of ${file.name}`}
            className="h-20 w-20 rounded-[var(--r-row)] border border-line object-cover"
          />
        ) : (
          <div className="mono-12 flex h-20 w-20 shrink-0 items-center justify-center rounded-[var(--r-row)] border border-line bg-void uppercase text-signal">
            {extensionOf(file.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="t-14 truncate text-primary">{file.name}</div>
          <div className="mono-12 mt-1 text-muted">{formatSize(file.size)}</div>
          {reads && reads.length > 0 && (
            <div className="mono-12 mt-2 text-secondary">
              Will read: {reads.join(" · ")}
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" type="button" onClick={() => inputRef.current?.click()}>
            Replace
          </Button>
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              onChange(null);
              onError(null);
            }}
          >
            Remove
          </Button>
        </div>
        {hiddenInput}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) take(f);
      }}
      className={`flex flex-col items-center justify-center gap-2 rounded-[var(--r-panel)] border border-dashed p-8 text-center transition-colors ${
        dragOver ? "border-signal bg-[var(--signal-wash)]" : "border-line bg-surface"
      }`}
    >
      <p className="t-16 text-primary">{hint}</p>
      <p className="mono-12 text-muted">
        {readable} · up to 10 MB
      </p>
      {reads && reads.length > 0 && (
        <p className="mono-12 mt-1 max-w-sm text-secondary">
          The pipeline will read: {reads.join(" · ")}
        </p>
      )}
      <Button
        variant="secondary"
        type="button"
        className="mt-2"
        onClick={() => inputRef.current?.click()}
      >
        Browse files
      </Button>
      {hiddenInput}
    </div>
  );
}
