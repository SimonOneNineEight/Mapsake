"use client";

import { useState } from "react";

export interface PhotoTile {
  key: string;
  src: string | null; // signed URL (persisted) or object URL (in-flight); null while signing
  state: "ready" | "uploading" | "error";
  onRetry?: () => void;
}

/**
 * Thumbnail grid for a pin's photos (Story 3.6). Presentational: the uploader builds the
 * tiles from persisted photos + in-flight queue items. Imagery follows the card radius
 * (rounded-md, DESIGN). A calm placeholder shows until each image loads (blur-up). An
 * errored tile shows a quiet inline "重試" — never a blocking error. Tapping a photo is
 * inert here; the full-screen viewer is Story 3.7. Renders nothing when there are no tiles
 * (absence is normal — no "0 photos", no empty frame).
 */
export function PhotoGrid({ tiles }: { tiles: PhotoTile[] }) {
  if (tiles.length === 0) return null;

  return (
    <ul className="grid grid-cols-3 gap-2">
      {tiles.map((tile) => (
        <li key={tile.key} className="relative aspect-square overflow-hidden rounded-md bg-muted">
          <Thumb src={tile.src} dimmed={tile.state !== "ready"} />
          {tile.state === "uploading" && (
            <span className="absolute inset-0 grid place-items-center">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
            </span>
          )}
          {tile.state === "error" && tile.onRetry && (
            <button
              type="button"
              onClick={tile.onRetry}
              className="absolute inset-0 grid place-items-center bg-black/30 text-xs text-white"
            >
              重試
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function Thumb({ src, dimmed }: { src: string | null; dimmed: boolean }) {
  const [loaded, setLoaded] = useState(false);
  if (!src) return null; // placeholder bg shows through
  const opacity = !loaded ? "opacity-0" : dimmed ? "opacity-60" : "opacity-100";
  return (
    // eslint-disable-next-line @next/next/no-img-element -- signed Storage URLs, not a static asset
    <img
      src={src}
      alt=""
      onLoad={() => setLoaded(true)}
      className={`h-full w-full object-cover transition-opacity duration-300 ${opacity}`}
    />
  );
}
