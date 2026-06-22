"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { buildStyle } from "../style";

// pmtiles protocol is a global singleton on the maplibre instance — register once.
let protocolRegistered = false;

/**
 * The Mapsake atlas. Renders the Story 1.2 boundary PMTiles (countries + regions
 * layers) on the parchment style, world → admin-1. Client-only: maplibre touches
 * `window`, so it's dynamic-imported inside the effect (SSR-safe).
 */
export function MapCanvas() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let map: import("maplibre-gl").Map | undefined;

    const win = window as unknown as { __mapsakeMap?: import("maplibre-gl").Map };

    (async () => {
      try {
        const maplibregl = (await import("maplibre-gl")).default;
        const { Protocol } = await import("pmtiles");
        if (cancelled || !ref.current) return;

        if (!protocolRegistered) {
          maplibregl.addProtocol("pmtiles", new Protocol().tile);
          protocolRegistered = true;
        }

        const pmtilesUrl = `${window.location.origin}/tiles/boundaries.pmtiles`;
        map = new maplibregl.Map({
          container: ref.current,
          style: buildStyle(pmtilesUrl),
          center: [0, 20],
          zoom: 1.5,
          // One world copy only — at world-landing zoom a wide viewport would
          // otherwise tile repeated earths east–west (duplicate labels).
          renderWorldCopies: false,
          // Render Han labels from the local Noto Sans TC (loaded via next/font),
          // avoiding a multi-MB CJK glyph download.
          localIdeographFontFamily: "'Noto Sans TC','Noto Sans CJK TC',sans-serif",
        });
        // Expose for e2e/verification right after construction so a later failure
        // still leaves the instance reachable (the e2e waits on this global).
        win.__mapsakeMap = map;
        // Surface tile/protocol load failures — without this a PMTiles 404 just
        // renders a silent blank parchment.
        map.on("error", (e) => console.error("[mapsake] map error:", e.error ?? e));

        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        // North-up parchment atlas: no rotation or tilt. Disable right-click/drag
        // rotate (desktop) and the two-finger rotate + pitch gestures (touch).
        map.dragRotate.disable();
        map.touchZoomRotate.disableRotation();
        map.touchPitch.disable();
        map.keyboard.disableRotation();
        // The canvas takes keyboard focus on click/drag; drop the browser's blue
        // focus ring so the parchment map stays clean (inline beats the UA outline).
        map.getCanvas().style.outline = "none";
        // The map is constructed in an effect (before the browser finishes layout);
        // resize once loaded so the canvas matches the final container size instead
        // of a stale/interim width.
        map.once("load", () => map?.resize());
      } catch (err) {
        console.error("[mapsake] map init failed:", err);
      }
    })();

    return () => {
      cancelled = true;
      // Clear the global only if it still points at this instance (avoid clobbering
      // a newer mount under StrictMode double-invoke), then tear down.
      if (win.__mapsakeMap === map) delete win.__mapsakeMap;
      map?.remove();
    };
  }, []);

  return (
    <div
      ref={ref}
      // Fills its host (the page sets the desktop inset padding). Desktop rounds +
      // shadows the map so it reads as a mounted keepsake; overflow clips the canvas.
      className="h-full w-full md:overflow-hidden md:rounded-[14px] md:shadow-[0_4px_16px_rgba(58,46,34,0.18)]"
      data-testid="map-canvas"
    />
  );
}
