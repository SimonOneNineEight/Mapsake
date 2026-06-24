// Onboarding preferences (Story 4.1). The default-view choice lives in localStorage for v1
// (per-device; no accounts yet — mirror to a `profiles` column when Epic 2 lands). Its PRESENCE
// is what marks the default-view question as answered. localStorage access is isolated here.

const KEY = "mapsake.defaultView";

export type DefaultView = { kind: "world" } | { kind: "focus"; countryCode: string };

/** The stored default view, or null if the question hasn't been answered (or storage is off). */
export function readDefaultView(): DefaultView | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DefaultView;
    if (parsed?.kind === "world") return { kind: "world" };
    if (parsed?.kind === "focus" && typeof parsed.countryCode === "string") {
      return { kind: "focus", countryCode: parsed.countryCode };
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
