"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface ViewerPhoto {
  id: string;
  url: string | null;
}

const CLOSE_PULL_PX = 110; // vertical drag past this (when not scrolling sideways) closes

/**
 * Full-screen photo viewer (Story 3.7). Portaled above the sheet/panel so it OWNS input —
 * the sheet's vertical drag and the map's pinch-zoom are inactive while it's up. Horizontal
 * swipe between photos is native CSS scroll-snap (the track is `touch-action: pan-x`, so the
 * browser pans sideways and leaves vertical gestures to the pull-to-close handler). Pull-down,
 * the × button, a tap on the letterbox backdrop, or Escape close back to the memory. ← / →
 * navigate. Photos blur-up while loading. The dark backdrop is a lightbox scrim, not the
 * deferred Lamplight theme; app chrome stays light.
 */
export function PhotoViewer({
  photos,
  initialIndex,
  onClose,
}: {
  photos: ViewerPhoto[];
  initialIndex: number;
  onClose: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // pull-to-close drag state
  const start = useRef<{ x: number; y: number } | null>(null);
  const vertical = useRef(false);
  const dragged = useRef(false); // any drag this gesture → don't treat the trailing click as a backdrop tap
  const [dy, setDy] = useState(0);

  // Lock body scroll while open; restore on close.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Move focus to the close button on open; restore it to the trigger (the tapped
  // thumbnail) on close so keyboard focus isn't dropped to <body> (WCAG 2.4.3).
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();
    return () => prevFocus?.focus?.();
  }, []);

  // Start on the tapped photo.
  useEffect(() => {
    const track = trackRef.current;
    if (track) track.scrollLeft = initialIndex * track.clientWidth;
  }, [initialIndex]);

  // Keyboard: Escape closes, ←/→ page (scroll-snap settles on the next photo).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const track = trackRef.current;
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") track?.scrollBy({ left: track.clientWidth, behavior: "smooth" });
      else if (e.key === "ArrowLeft") track?.scrollBy({ left: -track.clientWidth, behavior: "smooth" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const resetDrag = () => {
    start.current = null;
    vertical.current = false;
    setDy(0);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return; // mouse uses ×/backdrop/keys, not pull-down
    start.current = { x: e.clientX, y: e.clientY };
    vertical.current = false;
    dragged.current = false; // fresh gesture — a clean tap may close on the backdrop
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dyy = e.clientY - start.current.y;
    if (Math.abs(dx) > 8 || Math.abs(dyy) > 8) dragged.current = true; // not a tap → suppress backdrop close
    if (!vertical.current && dyy > 8 && Math.abs(dyy) > Math.abs(dx)) {
      vertical.current = true;
      // Capture so the rest of the vertical drag reaches us even if the finger leaves the
      // (now-translated) overlay. Captured only AFTER committing to vertical, so the native
      // horizontal scroll-snap pager keeps the touch for sideways swipes.
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // setPointerCapture can throw if the pointer is already gone — safe to ignore
      }
    }
    if (vertical.current && dyy > 0) setDy(dyy);
  };
  const onPointerUp = () => {
    if (vertical.current && dy > CLOSE_PULL_PX) onClose();
    resetDrag();
  };

  const style =
    dy > 0
      ? { transform: `translateY(${dy}px)`, opacity: Math.max(0.4, 1 - dy / 400) }
      : undefined;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="照片"
      style={style}
      className="fixed inset-0 z-[60] bg-black/90"
      // Tap on the letterbox backdrop closes (image stops propagation); a drag/swipe that
      // ends here must NOT close.
      onClick={() => {
        if (dragged.current) dragged.current = false;
        else onClose();
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={resetDrag}
    >
      <button
        ref={closeBtnRef}
        type="button"
        aria-label="關閉"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-2xl leading-none text-white"
      >
        ×
      </button>
      <div
        ref={trackRef}
        className="flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-contain [touch-action:pan-x]"
      >
        {photos.map((p) => (
          <div key={p.id} className="grid h-full w-screen shrink-0 snap-center place-items-center p-4">
            <Frame url={p.url} />
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}

function Frame({ url }: { url: string | null }) {
  const [loaded, setLoaded] = useState(false);
  if (!url) return <span className="h-24 w-24 rounded-md bg-white/10" />; // calm placeholder
  return (
    // eslint-disable-next-line @next/next/no-img-element -- signed Storage URLs, not a static asset
    <img
      src={url}
      alt=""
      onClick={(e) => e.stopPropagation()} // tapping the photo doesn't close; only the backdrop does
      onLoad={() => setLoaded(true)}
      className={`max-h-full max-w-full object-contain transition-opacity duration-300 ${
        loaded ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
