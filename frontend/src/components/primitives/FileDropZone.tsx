"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "./Button";

const ACCEPT = ".jpg,.jpeg,.png,.pdf,.gpx,.csv";
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["jpg", "jpeg", "png", "pdf", "gpx", "csv"]);
const IMAGE_EXT = new Set(["jpg", "jpeg", "png"]);

function extensionOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Drag-and-drop + click-to-browse (8.3 step 2b). Validates with the exact
 * messages from 5.1, previews images, allows remove and replace.
 */
export function FileDropZone({
  file,
  onChange,
  onError,
}: {
  file: File | null;
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

  const take = useCallback(
    (candidate: File) => {
      if (!ALLOWED.has(extensionOf(candidate.name))) {
        onError("Upload a JPG, PNG, PDF, GPX or CSV");
        return;
      }
      if (candidate.size > MAX_BYTES) {
        onError("File must be under 10 MB");
        return;
      }
      onError(null);
      onChange(candidate);
    },
    [onChange, onError],
  );

  // One hidden input serves both branches — browse, and replace.
  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPT}
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
      <div className="surface-terrace flex items-center gap-4 p-4">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={`Preview of ${file.name}`}
            className="h-20 w-20 rounded-[var(--radius-row)] object-cover"
          />
        ) : (
          <div className="type-mono-s flex h-20 w-20 items-center justify-center rounded-[var(--radius-row)] bg-night-ocean uppercase text-graticule">
            {extensionOf(file.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-airglow">{file.name}</div>
          <div className="type-mono-s mt-0.5 text-graticule">{formatSize(file.size)}</div>
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
      className={`flex flex-col items-center justify-center gap-2 rounded-[var(--radius-panel)] border border-dashed p-8 transition-colors ${
        dragOver ? "border-limb bg-[var(--limb-dim)]" : "border-[var(--rule-strong)] bg-shelf"
      }`}
    >
      <p className="text-sm text-airglow">Drop the file here</p>
      <p className="text-xs text-graticule">JPG, PNG, PDF, GPX or CSV — up to 10 MB</p>
      <Button variant="secondary" type="button" onClick={() => inputRef.current?.click()}>
        Browse files
      </Button>
      {hiddenInput}
    </div>
  );
}
