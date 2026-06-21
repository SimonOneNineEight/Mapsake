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

    (async () => {
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
        // Render Han labels from the local Noto Sans TC (loaded via next/font),
        // avoiding a multi-MB CJK glyph download.
        localIdeographFontFamily: "'Noto Sans TC','Noto Sans CJK TC',sans-serif",
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      // Expose for e2e/verification (harmless; used by the Playwright test).
      (window as unknown as { __mapsakeMap?: unknown }).__mapsakeMap = map;
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, []);

  return <div ref={ref} className="h-dvh w-full" data-testid="map-canvas" />;
}
