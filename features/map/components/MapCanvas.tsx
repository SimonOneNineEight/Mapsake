"use client";

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { buildStyle } from "../style";
import { applyVisitedState, createVisitedHatch, regionFromPoint } from "../lib/visited";
import {
  useAddRegionMark,
  useRegionMarks,
} from "@/features/regions/queries/region-marks-queries";
import { MarkStatus, type MarkPhase } from "@/features/regions/components/mark-status";
import { useSessionUserId } from "@/features/auth/hooks/use-session-user";

// pmtiles protocol is a global singleton on the maplibre instance — register once.
let protocolRegistered = false;

/**
 * The Mapsake atlas. Renders the boundary PMTiles on the parchment style and lets the
 * user tap a region to mark it visited (optimistic terracotta fill + hatch cue → durable
 * write to region_marks). Client-only: maplibre touches `window`, so it's dynamic-imported
 * inside the effect (SSR-safe).
 */
export function MapCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [offline, setOffline] = useState(false);

  const { data: marks } = useRegionMarks();
  const addMark = useAddRegionMark();
  const userId = useSessionUserId();

  // Keep the latest tap handler in a ref so the once-attached map `click` listener
  // never calls a stale closure. Updated in an effect (not during render).
  const onTapRef = useRef<(point: [number, number]) => void>(() => {});
  useEffect(() => {
    onTapRef.current = (point) => {
      const map = mapRef.current;
      if (!map) return;
      if (!userId) return; // session not resolved yet — ignore the tap (avoids a save with no optimistic fill)
      if (typeof navigator !== "undefined" && navigator.onLine === false) return; // offline guard (AC4)
      const region = regionFromPoint(map, point);
      if (region) addMark.mutate(region);
    };
  });

  // Build the map once.
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
          renderWorldCopies: false,
          localIdeographFontFamily: "'Noto Sans TC','Noto Sans CJK TC',sans-serif",
        });
        mapRef.current = map;
        win.__mapsakeMap = map;
        map.on("error", (e) => console.error("[mapsake] map error:", e.error ?? e));

        // Generate the visited hatch texture the first time a layer needs it.
        map.on("styleimagemissing", (e) => {
          if (e.id === "visited-hatch" && mapRef.current) createVisitedHatch(mapRef.current);
        });

        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        // North-up parchment atlas: no rotation or tilt.
        map.dragRotate.disable();
        map.touchZoomRotate.disableRotation();
        map.touchPitch.disable();
        map.keyboard.disableRotation();
        map.getCanvas().style.outline = "none";

        // Tap a region to mark it visited.
        map.on("click", (e) => onTapRef.current([e.point.x, e.point.y]));

        // Pointer cursor over markable land (desktop hover affordance).
        const setCursor = (c: string) => {
          const canvas = mapRef.current?.getCanvas();
          if (canvas) canvas.style.cursor = c;
        };
        for (const layer of ["regions-fill", "countries-fill-base", "countries-fill-world"]) {
          map.on("mouseenter", layer, () => setCursor("pointer"));
          map.on("mouseleave", layer, () => setCursor(""));
        }

        map.once("load", () => {
          map?.resize();
          // Reduced motion: fill instantly instead of fading in (AC5). Set after the
          // style loads so the fill layers exist.
          if (map && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
            for (const id of ["countries-fill-base", "countries-fill-world", "regions-fill"]) {
              map.setPaintProperty(id, "fill-color-transition", { duration: 0, delay: 0 });
            }
            for (const id of [
              "countries-visited-hatch-base",
              "countries-visited-hatch-world",
              "regions-visited-hatch",
            ]) {
              map.setPaintProperty(id, "fill-opacity-transition", { duration: 0, delay: 0 });
            }
          }
          if (!cancelled) setMapReady(true);
        });
      } catch (err) {
        console.error("[mapsake] map init failed:", err);
      }
    })();

    return () => {
      cancelled = true;
      if (win.__mapsakeMap === map) delete win.__mapsakeMap;
      mapRef.current = null;
      map?.remove();
    };
  }, []);

  // Track connectivity for the write-disabled banner.
  useEffect(() => {
    const update = () => setOffline(typeof navigator !== "undefined" && !navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // Apply the user's marks as feature-state (drives the terracotta fill + hatch).
  const prevStateRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const apply = () => {
      prevStateRef.current = applyVisitedState(map, marks ?? [], prevStateRef.current);
    };
    if (map.isSourceLoaded("boundaries")) {
      apply();
      return;
    }
    // setFeatureState no-ops before the source loads — wait for it, then apply.
    const onSourceData = (e: { sourceId?: string }) => {
      if (e.sourceId === "boundaries" && map.isSourceLoaded("boundaries")) apply();
    };
    map.on("sourcedata", onSourceData);
    return () => {
      map.off("sourcedata", onSourceData);
    };
  }, [marks, mapReady]);

  const phase: MarkPhase = addMark.isPending
    ? "pending"
    : addMark.isError
      ? "error"
      : addMark.isSuccess
        ? "success"
        : "idle";

  return (
    <div className="relative h-full w-full">
      <div
        ref={ref}
        className="h-full w-full md:overflow-hidden md:rounded-[14px] md:shadow-[0_4px_16px_rgba(58,46,34,0.18)]"
        data-testid="map-canvas"
      />
      {offline && (
        <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-card/95 px-3 py-1 text-sm text-muted-foreground shadow-[0_2px_10px_rgba(58,46,34,0.18)]">
          僅供瀏覽 — 重新連線後可標記
        </div>
      )}
      <MarkStatus
        phase={phase}
        onRetry={() => {
          if (addMark.variables) addMark.mutate(addMark.variables);
        }}
      />
    </div>
  );
}
