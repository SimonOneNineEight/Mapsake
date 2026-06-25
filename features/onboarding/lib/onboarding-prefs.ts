// Onboarding preferences (Story 4.1). The default-view choice lives in localStorage for v1
// (per-device; no accounts yet — mirror to a `profiles` column when Epic 2 lands). Its PRESENCE
// is what marks the default-view question as answered. localStorage access is isolated here.

const KEY = "mapsake.defaultView";

// `center` (the tapped [lng, lat]) is captured at pick time (Story 4.2) so a later open can
// frame the country with no lookup. Optional for back-compat with a 4.1 value (countryCode only).
export type DefaultView =
  | { kind: "world" }
  | { kind: "focus"; countryCode: string; center?: [number, number] };

const isLngLat = (v: unknown): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && Number.isFinite(v[0]) && Number.isFinite(v[1]);

/** The stored default view, or null if the question hasn't been answered (or storage is off). */
export function readDefaultView(): DefaultView | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DefaultView;
    if (parsed?.kind === "world") return { kind: "world" };
    if (parsed?.kind === "focus" && typeof parsed.countryCode === "string") {
      // Keep a valid center; drop a malformed one (still a valid focus → world-framing fallback).
      return isLngLat(parsed.center)
        ? { kind: "focus", countryCode: parsed.countryCode, center: parsed.center }
        : { kind: "focus", countryCode: parsed.countryCode };
    }
    return null; // malformed
  } catch {
    return null; // private-mode / unavailable storage
  }
}

/** Persist the default-view choice. Best-effort (a storage failure must not break onboarding). */
export function writeDefaultView(view: DefaultView): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(view));
  } catch {
    // ignore — onboarding still proceeds for this session even if persistence fails
  }
}

// Post-payoff "keep your map" prompt (Story 2.3). Shown once, right after the onboarding payoff,
// then suppressed forever so it never nags. Its presence marks "already prompted".
const PROMPT_KEY = "mapsake.accountPromptSeen";

/** Whether the post-payoff "keep your map" prompt has already been shown (Story 2.3). */
export function readAccountPromptSeen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PROMPT_KEY) === "1";
  } catch {
    return false;
  }
}

/** Mark the post-payoff prompt as shown so it never re-nags. Best-effort. */
export function writeAccountPromptSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROMPT_KEY, "1");
  } catch {
    // ignore — a storage failure must not break the flow
  }
}
