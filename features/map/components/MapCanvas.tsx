"use client";

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { buildStyle } from "../style";
import { applyVisitedState, createVisitedHatch, regionFromPoint } from "../lib/visited";
import { applyPins } from "../lib/pins";
import {
  useAddRegionMark,
  useRegionMarks,
} from "@/features/regions/queries/region-marks-queries";
import { useAddPin, usePins } from "@/features/pins/queries/pins-queries";
import { AddPinButton } from "@/features/pins/components/add-pin-button";
import { PinNameInput } from "@/features/pins/components/pin-name-input";
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

  const { data: pins } = usePins();
  const addPin = useAddPin();
  // Drop mode (Story 3.1): while ON, the next map tap lands a pin instead of marking.
  const [dropMode, setDropMode] = useState(false);
  // Ref mirror so the once-attached pins-cluster click listener can read the latest dropMode.
  const dropModeRef = useRef(false);
  // A just-dropped pin awaiting its name — its coords + the region/country under the tap.
  const [pendingPin, setPendingPin] = useState<
    { lng: number; lat: number; regionCode: string | null; countryCode: string | null } | null
  >(null);

  // Keep the latest tap handler in a ref so the once-attached map `click` listener
  // never calls a stale closure. Updated in an effect (not during render).
  const onTapRef = useRef<(point: [number, number], lngLat: { lng: number; lat: number }) => void>(
    () => {},
  );
  useEffect(() => {
    dropModeRef.current = dropMode; // keep the ref in sync for the cluster click listener
    onTapRef.current = (point, lngLat) => {
      const map = mapRef.current;
      if (!map) return;
      // Drop mode → land a pin at the tapped coords. Capture the region/country under the
      // tap (regionFromPoint) so Story 3.9 can later roll the region up to visited. The
      // name is captured next (pendingPin → PinNameInput). Exit drop mode after placing.
      if (dropMode) {
        const region = regionFromPoint(map, point);
        setPendingPin({
          lng: lngLat.lng,
          lat: lngLat.lat,
          regionCode: region?.regionCode ?? null,
          countryCode: region?.countryCode ?? null,
        });
        setDropMode(false);
        return;
      }
      // Plain tap → mark the region (Story 1.5), unchanged.
      if (!userId) return; // session not resolved yet — ignore the tap (avoids a save with no optimistic fill)
      if (typeof navigator !== "undefined" && navigator.onLine === false) return; // offline guard (AC4)
      // A tap on a pin or a cluster is a no-op here — never mark the region. (Opening a pin
      // is Story 3.4; a cluster tap expands it, handled by the pins-cluster click listener.)
      if (map.queryRenderedFeatures(point, { layers: ["pins-marker", "pins-cluster"] }).length > 0)
        return;
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

        // Tap a region to mark it visited (or, in drop mode, land a pin at e.lngLat).
        map.on("click", (e) => onTapRef.current([e.point.x, e.point.y], e.lngLat));

        // Click a cluster → zoom to its expansion zoom so it splits toward individual pins
        // (Story 3.3). The general click handler above no-ops over a cluster (tap guard).
        map.on("click", "pins-cluster", async (e) => {
          if (dropModeRef.current) return; // in drop mode a tap places a pin — don't also expand
          const feature = e.features?.[0];
          const clusterId = feature?.properties?.cluster_id;
          const src = mapRef.current?.getSource("pins") as
            | import("maplibre-gl").GeoJSONSource
            | undefined;
          if (clusterId == null || !src || feature?.geometry.type !== "Point") return;
          try {
            const zoom = await src.getClusterExpansionZoom(clusterId);
            mapRef.current?.easeTo({ center: feature.geometry.coordinates as [number, number], zoom });
          } catch (err) {
            console.error("[mapsake] cluster expand failed:", err);
          }
        });

        // Pointer cursor over markable land + clickable clusters (desktop hover affordance).
        // Individual pins are NOT clickable yet (open-pin is Story 3.4), so no pointer there.
        const setCursor = (c: string) => {
          const canvas = mapRef.current?.getCanvas();
          if (canvas) canvas.style.cursor = c;
        };
        for (const layer of [
          "regions-fill",
          "countries-fill-base",
          "countries-fill-world",
          "pins-cluster",
        ]) {
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

  // Push the user's pins into the `pins` GeoJSON source (drives the marker layer).
  // applyPins no-ops until the source exists; the source is in the style from load.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    applyPins(map, pins ?? []);
  }, [pins, mapReady]);

  const toPhase = (m: { isPending: boolean; isError: boolean; isSuccess: boolean }): MarkPhase =>
    m.isPending ? "pending" : m.isError ? "error" : m.isSuccess ? "success" : "idle";
  // One quiet save indicator covers both writes (they're sequential user actions). Show the
  // pin write when it's in flight/recent, else the region-mark write. Retry targets whichever
  // is showing — so a failed pin write gets the same calm retry as a mark (durable-write, AC4).
  const pinPhase = toPhase(addPin);
  const showingPin = pinPhase !== "idle";
  const phase: MarkPhase = showingPin ? pinPhase : toPhase(addMark);
  const onRetry = () => {
    if (showingPin) {
      if (addPin.variables) addPin.mutate(addPin.variables);
    } else if (addMark.variables) {
      addMark.mutate(addMark.variables);
    }
  };

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
      <MarkStatus phase={phase} onRetry={onRetry} />
      {/* "+ add memory" affordance — the deliberate entry into drop mode (Story 3.1).
          Bottom-right so it clears the bottom-center save indicator. */}
      <div className="absolute bottom-6 right-4">
        <AddPinButton
          active={dropMode}
          disabled={!userId || offline}
          onToggle={() => setDropMode((v) => !v)}
        />
      </div>
      {pendingPin && (
        <PinNameInput
          onSave={(name) => {
            addPin.mutate({
              name,
              lat: pendingPin.lat,
              lng: pendingPin.lng,
              regionCode: pendingPin.regionCode,
              countryCode: pendingPin.countryCode,
            });
            setPendingPin(null);
          }}
          onCancel={() => setPendingPin(null)}
        />
      )}
    </div>
  );
}
