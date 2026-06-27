"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MapCanvas } from "@/features/map/components/MapCanvas";
import { SettingsSheet } from "@/features/settings/components/settings-sheet";
import { Onboarding } from "@/features/onboarding/components/onboarding";
import {
  readAccountPromptSeen,
  readDefaultView,
  writeAccountPromptSeen,
  writeDefaultView,
} from "@/features/onboarding/lib/onboarding-prefs";
import { useAccount } from "@/features/auth/hooks/use-account";
import { useInstallPrompt } from "@/features/onboarding/lib/use-install-prompt";
import { PlacesPanel } from "@/features/places/components/places-panel";
import { AccountSheet } from "@/features/auth/components/account-sheet";
import { usePin, usePins } from "@/features/pins/queries/pins-queries";
import { memoriesSharingDay } from "@/features/notifications/lib/eligibility";
import { MemoryContainer } from "./memory-container";

/**
 * The home surface: the map plus the memory panel/sheet (Story 3.4). Owns the ephemeral
 * `selectedPinId` (UI state, not server state) — set when a pin is tapped, cleared on close.
 * On ≥840px the panel is a flex sibling so the map cell shrinks beside it (MapCanvas resizes
 * via its ResizeObserver); on phone the memory is a non-modal Vaul sheet over the map.
 *
 * Also coordinates first-run onboarding (Story 4.1): the default-view question. It owns the
 * step + the localStorage write (the focus `countryCode` arrives here from the map tap).
 */
export function MapMemoryShell() {
  const t = useTranslations("settings");
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  // Settings sheet (Story 6.3) + a Settings-initiated default-view focus pick (vs the onboarding pick).
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pickingFocus, setPickingFocus] = useState(false);
  // Onboarding step: null = not onboarding (returning user or finished). Set after mount so
  // there's no SSR/hydration flash (localStorage is client-only).
  const [onboarding, setOnboarding] = useState<"question" | "pick" | "backfill" | "handoff" | null>(null);
  // The saved view read ONCE for the opening camera (Story 4.2 — land on it). Lazy initializer:
  // SSR returns null (window guard); consumed only inside MapCanvas's client build effect, so no
  // hydration mismatch. A returning focus user opens already framed on their country.
  const [initialView] = useState(() => readDefaultView());
  // PWA install affordance (Story 4.5), folded into the hand-off card. Lives here (always mounted)
  // so the Chromium beforeinstallprompt is caught even if it fires before the hand-off renders.
  const { mode: installMode, promptInstall } = useInstallPrompt();
  // Imperative camera handle for the "Places visited" list (Story 4.7) — fly to a pin without
  // importing MapLibre here (it stays in features/map). MapCanvas assigns it once ready.
  const cameraRef = useRef<{ flyToPin: (lat: number, lng: number) => void } | null>(null);
  // Post-payoff "keep your map" prompt (Story 2.3): opens the account sheet ONCE right after the
  // onboarding payoff. Only for an anon user who hasn't seen it — never a returning/signed-in user.
  const account = useAccount();
  const signedIn = !account.isAnonymous && Boolean(account.email);
  const [promptAccount, setPromptAccount] = useState(false);

  // Re-live deep-link (Story 5.4): a notification opens /?pin={id}. Read it ONCE (lazy init; SSR
  // returns null via the window guard, and it's consumed only in effects/props so there's no
  // hydration mismatch — same approach as initialView). Used to open the memory, fly to the pin,
  // and skip first-run onboarding.
  const [deepLinkPinId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("pin") || null;
  });
  const deepLinkPin = usePin(deepLinkPinId);
  const pinsQuery = usePins();
  const landedRef = useRef(false);
  // Re-live cohort (Story 5.5): the landed pin + its same-anniversary siblings, in order. Drives the
  // "N more from this day" chip + cycling. Empty for normal (non-landing) browsing. flyTarget is the
  // currently re-lived pin's coords — set on landing AND on each cohort advance so the map re-flies.
  const [reliveCohort, setReliveCohort] = useState<string[]>([]);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Onboarding is the first-run experience for an ANONYMOUS user. A signed-in (permanent) user has
    // already been through it, so they never see it again — even on a new device or after clearing
    // local data, where the localStorage default-view is gone (that's what made returning users
    // re-onboard). Wait for the session to resolve (userId set) before deciding, so a signed-in user
    // doesn't flash the question. Deciding from localStorage on mount (not SSR) avoids a hydration
    // flash; a deep-link arrival (?pin=) is intentful + the pin is the user's own, so it skips too.
    if (account.userId === null) return; // session not resolved yet
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (account.isAnonymous && readDefaultView() === null && !deepLinkPinId) setOnboarding("question");
  }, [account.userId, account.isAnonymous, deepLinkPinId]);

  // Scrub ?pin= from the URL once handled so a refresh/back won't re-trigger the landing.
  useEffect(() => {
    if (deepLinkPinId) window.history.replaceState(null, "", window.location.pathname);
  }, [deepLinkPinId]);

  // Land the deep-link: once the pin RESOLVES from the loaded list, open its memory (+ glow, via
  // selectedPinId), set the fly target, and build the same-day cohort for "N more from this day"
  // (Story 5.5). If the pins have loaded and the pin is still absent (deleted/foreign), give up
  // calmly — nothing opens (AC4). A named fn keeps the multi-setState out of the effect body.
  useEffect(() => {
    if (!deepLinkPinId || landedRef.current) return;
    const land = () => {
      if (deepLinkPin) {
        landedRef.current = true;
        const siblings = memoriesSharingDay(pinsQuery.data ?? [], deepLinkPin.id);
        setReliveCohort([deepLinkPin.id, ...siblings.map((s) => s.id)]);
        setSelectedPinId(deepLinkPin.id);
        setFlyTarget({ lat: deepLinkPin.lat, lng: deepLinkPin.lng });
      } else if (pinsQuery.isSuccess) {
        landedRef.current = true; // loaded, pin not found → land on the map, no open
      }
    };
    land();
  }, [deepLinkPinId, deepLinkPin, pinsQuery.isSuccess, pinsQuery.data]);

  // Advance to the next same-day memory (Story 5.5): move selection + re-fly. Cyclic over the cohort.
  const advanceReliveCohort = () => {
    if (selectedPinId == null || reliveCohort.length < 2) return;
    const idx = reliveCohort.indexOf(selectedPinId);
    if (idx === -1) return;
    const nextId = reliveCohort[(idx + 1) % reliveCohort.length];
    const next = (pinsQuery.data ?? []).find((p) => p.id === nextId);
    if (!next) return;
    setSelectedPinId(nextId);
    setFlyTarget({ lat: next.lat, lng: next.lng });
  };

  // Closing clears the cohort so a later normal open of any pin shows no "N more" chip.
  const closeMemory = () => {
    setSelectedPinId(null);
    setReliveCohort([]);
  };

  // A normal map/Places tap leaves the re-live flow → clear the cohort, so the "N more" chip stays
  // landing-only and can't resurface when a later tap lands on a stale same-day sibling (Story 5.5).
  // The cohort advance + the deep-link landing set selection directly, preserving the cohort.
  const openPin = (id: string) => {
    setReliveCohort([]);
    setSelectedPinId(id);
  };

  // "N more from this day": shown only while the open pin is part of the re-live cohort.
  const reliveMore =
    selectedPinId != null && reliveCohort.includes(selectedPinId) ? reliveCohort.length - 1 : 0;

  // After the view question, drop into backfill (Story 4.3) — the user marks rapidly before
  // the map is "theirs". finishBackfill closes onboarding into the filled map.
  const finishWorld = () => {
    writeDefaultView({ kind: "world" }); // stays on the world view (the map's default framing)
    setOnboarding("backfill");
  };
  const finishFocus = (countryCode: string, center: [number, number]) => {
    // Store the tapped center so a later open can frame the country (Story 4.2).
    writeDefaultView({ kind: "focus", countryCode, center });
    setOnboarding("backfill");
  };
  // Backfill's 完成 advances to the gentle hand-off line (Story 4.4); dismissing it drops the
  // user into the freshly colored map. The map is the payoff — no account nudge here (Epic 2).
  const finishBackfill = () => setOnboarding("handoff");
  const finishHandoff = () => {
    setOnboarding(null);
    // The payoff has landed — invite the anon user to keep their map (Story 2.3), once, never a nag.
    if (!signedIn && !readAccountPromptSeen()) {
      writeAccountPromptSeen();
      setPromptAccount(true);
    }
  };

  return (
    <div className="flex h-full w-full">
      <div className="relative min-w-0 flex-1">
        <MapCanvas
          onOpenPin={openPin}
          selectedPinId={selectedPinId}
          initialView={initialView}
          pickCountry={onboarding === "pick" || pickingFocus}
          onCountryPick={({ countryCode, lngLat }) => {
            if (pickingFocus) {
              // Settings-initiated default-view change (Story 6.3): just persist the focus view (takes
              // effect on the next open, Story 4.2) — never re-enter onboarding backfill/hand-off.
              writeDefaultView({ kind: "focus", countryCode, center: [lngLat.lng, lngLat.lat] });
              setPickingFocus(false);
            } else {
              finishFocus(countryCode, [lngLat.lng, lngLat.lat]);
            }
          }}
          cameraRef={cameraRef}
          flyToMemoryTarget={flyTarget}
        />
        {/* Settings-initiated focus pick (Story 6.3): a calm non-blocking hint so the map tap that
            sets the default-view country isn't a mystery; tapping a country resolves it (above). */}
        {pickingFocus && (
          <div className="pointer-events-none absolute inset-x-0 top-4 z-30 flex flex-col items-center gap-2">
            <p className="rounded-full bg-card/95 px-4 py-1.5 text-sm text-foreground shadow-[0_2px_10px_rgba(58,46,34,0.18)]">
              {t("pickFocusHint")}
            </p>
            <button
              type="button"
              onClick={() => setPickingFocus(false)}
              className="pointer-events-auto py-1.5 text-sm text-[rgb(var(--terracotta-text))] hover:underline"
            >
              {t("cancel")}
            </button>
          </div>
        )}
        {/* "Places visited" list (Story 4.7) — the accessible browse path. Hidden during the
            first-run onboarding so the payoff stays clean; available once the map is the user's. */}
        {!onboarding && (
          <PlacesPanel
            onOpenPin={openPin}
            onFlyToPin={(lat, lng) => cameraRef.current?.flyToPin(lat, lng)}
          />
        )}
        {/* "Keep your map" sign-in (Story 2.1) — a quiet account affordance, never a gate;
            hidden during onboarding so the first-run payoff stays clean. */}
        {!onboarding && (
          <AccountSheet autoOpen={promptAccount} onOpenSettings={() => setSettingsOpen(true)} />
        )}
        {!onboarding && (
          <SettingsSheet
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            onPickFocus={() => {
              setSettingsOpen(false);
              setPickingFocus(true);
            }}
          />
        )}
        {onboarding && (
          <Onboarding
            step={onboarding}
            onChooseWorld={finishWorld}
            onChooseFocus={() => setOnboarding("pick")}
            onBack={() => setOnboarding("question")}
            onDone={finishBackfill}
            onDismiss={finishHandoff}
            installMode={installMode}
            onInstall={promptInstall}
          />
        )}
      </div>
      <MemoryContainer
        pinId={selectedPinId}
        onClose={closeMemory}
        reliveMore={reliveMore}
        onReliveNext={advanceReliveCohort}
      />
    </div>
  );
}
