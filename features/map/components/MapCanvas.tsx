"use client";

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { buildStyle } from "../style";
import { applyVisitedState, createVisitedHatch, pinsToVisitedMarks, regionFromPoint } from "../lib/visited";
import { applyPins } from "../lib/pins";
import {
  useAddRegionMark,
  useRegionMarks,
  useUnmarkRegion,
  type AddRegionMarkInput,
  type UnmarkRegionInput,
} from "@/features/regions/queries/region-marks-queries";
import { useAddPin, usePins } from "@/features/pins/queries/pins-queries";
import type { Pin } from "@/data/pins";
import type { DefaultView } from "@/features/onboarding/lib/onboarding-prefs";
import { AddPinButton } from "@/features/pins/components/add-pin-button";
import { PinNameInput } from "@/features/pins/components/pin-name-input";
import { RegionRemoveDialog } from "@/features/regions/components/region-remove-dialog";
import { SaveStatus, type SavePhase } from "@/components/save-status";
import { useOffline } from "@/features/pwa/use-offline";
import { useSessionUserId } from "@/features/auth/hooks/use-session-user";

// pmtiles protocol is a global singleton on the maplibre instance — register once.
let protocolRegistered = false;

/**
 * The Mapsake atlas. Renders the boundary PMTiles on the parchment style and lets the
 * user tap a region to mark it visited (optimistic terracotta fill + hatch cue → durable
 * write to region_marks). Client-only: maplibre touches `window`, so it's dynamic-imported
 * inside the effect (SSR-safe).
 */
export function MapCanvas({
  onOpenPin,
  selectedPinId,
  pickCountry = false,
  onCountryPick,
  initialView,
  cameraRef,
  flyToMemoryTarget,
}: {
  onOpenPin?: (pinId: string) => void; // tap an individual pin → open its memory (Story 3.4)
  selectedPinId?: string | null; // the opened pin → drives the accent glow layer
  pickCountry?: boolean; // onboarding focus-pick mode (Story 4.1): a tap selects a country, not a mark
  onCountryPick?: (info: { countryCode: string; lngLat: { lng: number; lat: number } }) => void;
  initialView?: DefaultView | null; // saved view → opening camera (Story 4.2: land on it)
  // Imperative camera handle (Story 4.7): the Places list flies to a pin without importing MapLibre
  // (kept confined to features/map). Assigned once the map is ready, cleared on teardown.
  cameraRef?: React.MutableRefObject<{ flyToPin: (lat: number, lng: number) => void } | null>;
  // Re-live deep-link target (Story 5.4): the landed pin's coords. The map flies to it once IT is
  // ready (so there's no race with the cameraRef being assigned at load), then once only.
  flyToMemoryTarget?: { lat: number; lng: number } | null;
} = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  // The opening camera is a mount-time value — capture it in a ref so the build-once effect
  // reads it without making it a dependency (a later initialView change must not rebuild the map).
  const initialViewRef = useRef(initialView);
  const [mapReady, setMapReady] = useState(false);
  // One connectivity signal (Story 2.5) — was a duplicate local listener; now the shared hook
  // that also gates the memory-card/photo writes. Starts false on SSR/first paint (no flash).
  const offline = useOffline();

  const { data: marks } = useRegionMarks();
  const addMark = useAddRegionMark();
  const userId = useSessionUserId();

  const { data: pins } = usePins();
  const addPin = useAddPin();
  const unmarkRegion = useUnmarkRegion();
  // "Remove this place" target awaiting confirm (Story 3.10) — the region + its pins.
  const [pendingUnmark, setPendingUnmark] = useState<
    { regionCode: string; level: "country" | "admin1"; name: string; pins: Pin[] } | null
  >(null);
  // Durable-write retain+retry (Story 2.5). Region-mark writes are keyed by regionCode|level so a
  // NON-latest failed tap during rapid backfill is still retained + retryable (the single mutation
  // instance only tracks the latest — the Story 1.5 silent-loss gap). A failed unmark is likewise
  // retained for a calm retry (the Story 3.10 gap, which had no error surface before).
  const [failedMarks, setFailedMarks] = useState<AddRegionMarkInput[]>([]);
  const [failedUnmark, setFailedUnmark] = useState<UnmarkRegionInput | null>(null);
  const markKey = (m: { regionCode: string; level: string }) => `${m.regionCode}|${m.level}`;

  // Fire a region-mark write, tracking failure BY REGION KEY so a non-latest failed tap is
  // retained + retryable (the optimistic fill already stays; this adds the missing retry signal).
  const runMark = (region: AddRegionMarkInput) => {
    addMark
      .mutateAsync(region)
      .then(() => setFailedMarks((f) => f.filter((x) => markKey(x) !== markKey(region))))
      .catch(() =>
        setFailedMarks((f) =>
          f.some((x) => markKey(x) === markKey(region)) ? f : [...f, region],
        ),
      );
  };
  const retryMarks = () => {
    const queued = failedMarks;
    setFailedMarks([]);
    queued.forEach(runMark);
  };
  // Fire an unmark, retaining its input for a calm retry on failure (Story 3.10 gap).
  const runUnmark = (input: UnmarkRegionInput) => {
    setFailedUnmark(null);
    unmarkRegion.mutateAsync(input).catch(() => setFailedUnmark(input));
  };
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
  // Latest onOpenPin for the once-attached pins-marker click listener (avoids a stale closure).
  const onOpenPinRef = useRef(onOpenPin);
  // Latest long-press (contextmenu) handler for "Remove this place" (Story 3.10).
  const onContextRef = useRef<(point: [number, number]) => void>(() => {});
  useEffect(() => {
    onOpenPinRef.current = onOpenPin;
    dropModeRef.current = dropMode; // keep the ref in sync for the cluster click listener
    // Long-press / right-click a VISITED region → "Remove this place" (Story 3.10). A bare mark
    // (no pins) unmarks with no friction; a region holding pins opens the gentle confirm.
    onContextRef.current = (point) => {
      const map = mapRef.current;
      if (!map || !userId) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return; // offline: unmark is a write (Story 4.6)
      // Over a pin/cluster → not a region action (mirror the tap guard).
      if (map.queryRenderedFeatures(point, { layers: ["pins-marker", "pins-cluster"] }).length > 0)
        return;
      const region = regionFromPoint(map, point);
      if (!region) return;
      const inRegion = (pins ?? []).filter((p) =>
        region.level === "admin1"
          ? p.regionCode === region.regionCode
          : p.countryCode === region.regionCode,
      );
      const hasMark = (marks ?? []).some(
        (m) => m.regionCode === region.regionCode && m.level === region.level,
      );
      if (!hasMark && inRegion.length === 0) return; // not visited → no-op
      if (inRegion.length === 0) {
        // Bare mark → remove with no friction.
        runUnmark({ regionCode: region.regionCode, level: region.level, pins: [] });
        return;
      }
      // Holds pins → confirm, naming the loss. Pull a zh-TW label off the fill feature.
      const feats = map.queryRenderedFeatures(point, {
        layers: ["regions-fill", "countries-fill-base", "countries-fill-world"],
      });
      const f = feats.find((ff) => ff.properties?.iso === region.regionCode);
      const name = (f?.properties?.name_zh ?? f?.properties?.name ?? "這個地區") as string;
      setPendingUnmark({ regionCode: region.regionCode, level: region.level, name, pins: inRegion });
    };
    onTapRef.current = (point, lngLat) => {
      const map = mapRef.current;
      if (!map) return;
      // Onboarding focus-pick (Story 4.1): a tap selects a country and flies into its regions,
      // and never marks. At the world zoom regionFromPoint resolves a country.
      if (pickCountry) {
        const region = regionFromPoint(map, point);
        if (region) {
          map.easeTo({ center: [lngLat.lng, lngLat.lat], zoom: 4 });
          onCountryPick?.({ countryCode: region.countryCode, lngLat });
        }
        return;
      }
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
      if (region) runMark(region);
    };
  });

  // Build the map once.
  useEffect(() => {
    let cancelled = false;
    let map: import("maplibre-gl").Map | undefined;
    let resizeObserver: ResizeObserver | undefined;
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
        // Open on the saved view (Story 4.2): a focus view with a stored center frames that
        // country (zoom 4); otherwise the world default. A focus value without a center (a
        // pre-4.2 stored value) falls back to world framing.
        const view = initialViewRef.current;
        const focusCenter = view?.kind === "focus" && view.center ? view.center : null;
        map = new maplibregl.Map({
          container: ref.current,
          style: buildStyle(pmtilesUrl),
          center: focusCenter ?? [0, 20],
          zoom: focusCenter ? 4 : 1.5,
          renderWorldCopies: false,
          localIdeographFontFamily: "'Noto Sans TC','Noto Sans CJK TC',sans-serif",
        });
        mapRef.current = map;
        win.__mapsakeMap = map;
        if (cameraRef) {
          cameraRef.current = {
            flyToPin: (lat, lng) => map?.flyTo({ center: [lng, lat], zoom: 6 }),
          };
        }
        map.on("error", (e) => console.error("[mapsake] map error:", e.error ?? e));

        // Resize the canvas when its container changes (e.g. the memory panel docks/undocks
        // and the map cell shrinks/grows) — MapLibre's trackResize only watches the window.
        resizeObserver = new ResizeObserver(() => mapRef.current?.resize());
        resizeObserver.observe(ref.current);

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

        // Long-press (touch) / right-click (desktop) a visited region → "Remove this place"
        // (Story 3.10). Suppress the browser context menu so only ours shows.
        map.on("contextmenu", (e) => {
          e.preventDefault();
          onContextRef.current([e.point.x, e.point.y]);
        });

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

        // Click an individual pin → open its memory (Story 3.4). Gated on drop mode so a
        // drop-mode tap still places a new pin. The general tap guard no-ops over pins-marker.
        map.on("click", "pins-marker", (e) => {
          if (dropModeRef.current) return;
          const id = e.features?.[0]?.properties?.id;
          if (typeof id === "string") onOpenPinRef.current?.(id);
        });

        // Pointer cursor over markable land, clickable clusters, and pins (open-on-tap,
        // Story 3.4) — the desktop hover affordance.
        const setCursor = (c: string) => {
          const canvas = mapRef.current?.getCanvas();
          if (canvas) canvas.style.cursor = c;
        };
        for (const layer of [
          "regions-fill",
          "countries-fill-base",
          "countries-fill-world",
          "pins-cluster",
          "pins-marker",
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
      resizeObserver?.disconnect();
      if (win.__mapsakeMap === map) delete win.__mapsakeMap;
      if (cameraRef) cameraRef.current = null;
      mapRef.current = null;
      map?.remove();
    };
    // Build-once effect; `cameraRef` is a stable ref object (mirrors the onOpenPin/initialView
    // pattern) so it doesn't belong in deps — the map must not rebuild when props change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply visited feature-state (drives the terracotta fill + hatch) from BOTH explicit marks
  // AND pins (Story 3.9 roll-up). The derived set is recomputed on every marks/pins change, so
  // dropping a pin lights its region+country and removing the last contributing pin clears it.
  const prevStateRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const apply = () => {
      const allMarks = [...(marks ?? []), ...pinsToVisitedMarks(pins ?? [])];
      prevStateRef.current = applyVisitedState(map, allMarks, prevStateRef.current);
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
  }, [marks, pins, mapReady]);

  // Push the user's pins into the `pins` GeoJSON source (drives the marker layer).
  // applyPins no-ops until the source exists; the source is in the style from load.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    applyPins(map, pins ?? []);
  }, [pins, mapReady]);

  // Drive the selected-pin glow: filter `pins-selected` to the opened pin (Story 3.4).
  // Empty id matches nothing → no glow when closed.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.setFilter("pins-selected", [
      "all",
      ["!", ["has", "point_count"]],
      ["==", ["get", "id"], selectedPinId ?? ""],
    ]);
  }, [selectedPinId, mapReady]);

  // Re-live deep-link landing (Story 5.4): fly to the target pin's region (zoom 7.5 — past the
  // marker fade-in at 6.5), then, if the pin is still swallowed by a cluster there, zoom by the
  // cluster's expansion amount so it splits into the individual, glowing pin. A region zoom alone
  // can't guarantee declustering (clusterMaxZoom is 14), so we reuse the cluster-tap expansion.
  // Reduced-motion → instant placement (no flying), the glow/memory still fade. Fires once.
  const flewToMemoryRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !flyToMemoryTarget || flewToMemoryRef.current) return;
    flewToMemoryRef.current = true;
    const { lat, lng } = flyToMemoryTarget;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    // After arriving, if a cluster sits over the target, expand it so the individual pin (and its
    // glow) shows. queryRenderedFeatures needs the move to have settled, so run it on moveend.
    const declusterIfNeeded = () => {
      const pt = map.project([lng, lat]);
      const near: [[number, number], [number, number]] = [
        [pt.x - 30, pt.y - 30],
        [pt.x + 30, pt.y + 30],
      ];
      const clusterId = map.queryRenderedFeatures(near, { layers: ["pins-cluster"] })[0]?.properties
        ?.cluster_id;
      if (clusterId == null) return; // target renders individually → its glow already shows
      const src = map.getSource("pins") as import("maplibre-gl").GeoJSONSource | undefined;
      src
        ?.getClusterExpansionZoom(clusterId)
        .then((z) =>
          map.easeTo({ center: [lng, lat], zoom: Math.max(z, 7.5), duration: reduced ? 0 : 600 }),
        )
        .catch((err) => console.error("[mapsake] re-live decluster failed:", err));
    };

    map.once("moveend", declusterIfNeeded);
    const camera = { center: [lng, lat] as [number, number], zoom: 7.5 };
    if (reduced) map.jumpTo(camera);
    else map.flyTo(camera);
  }, [flyToMemoryTarget, mapReady]);

  // One quiet save indicator (Story 2.5) covers marks, the pin write, AND the unmark — through the
  // shared SaveStatus. Unmark (destructive, rare) takes display priority; otherwise marks + pins
  // share the "save" pill. Errors come from the KEYED failure state (failedMarks/failedUnmark) so a
  // non-latest failed write is represented, not just the latest mutation instance.
  let savePhase: SavePhase;
  let saveKind: "save" | "remove";
  let onRetry: () => void;
  if (unmarkRegion.isPending || failedUnmark) {
    saveKind = "remove";
    savePhase = unmarkRegion.isPending ? "pending" : "error";
    onRetry = () => {
      if (failedUnmark) runUnmark(failedUnmark);
    };
  } else {
    saveKind = "save";
    const saving = addMark.isPending || addPin.isPending;
    const errored = failedMarks.length > 0 || addPin.isError;
    savePhase = saving
      ? "pending"
      : errored
        ? "error"
        : addMark.isSuccess || addPin.isSuccess
          ? "success"
          : "idle";
    onRetry = () => {
      if (addPin.isError && addPin.variables) addPin.mutate(addPin.variables);
      if (failedMarks.length > 0) retryMarks();
    };
  }

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
      <SaveStatus phase={savePhase} kind={saveKind} onRetry={onRetry} />
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
      <RegionRemoveDialog
        // Gate on !offline (Story 4.6): if opened online then disconnected, close it — unmark is
        // a destructive write and must not fire offline (never a silent failure).
        open={pendingUnmark !== null && !offline}
        name={pendingUnmark?.name ?? ""}
        pinCount={pendingUnmark?.pins.length ?? 0}
        onConfirm={() => {
          if (pendingUnmark && !offline) {
            runUnmark({
              regionCode: pendingUnmark.regionCode,
              level: pendingUnmark.level,
              pins: pendingUnmark.pins,
            });
          }
          setPendingUnmark(null);
        }}
        onClose={() => setPendingUnmark(null)}
      />
    </div>
  );
}
