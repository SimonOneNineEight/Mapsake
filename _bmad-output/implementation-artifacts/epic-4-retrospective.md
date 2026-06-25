# Epic 4 Retrospective — First-run & make it yours (onboarding + PWA)

Date: 2026-06-25 · Stories: 4-1 … 4-7 (all done) · Outcome: epic complete

## What shipped
Default-view question (4-1), land-on-saved-view (4-2), rapid backfill rhythm (4-3), payoff hand-off (4-4), PWA installable shell + install nudge (4-5), offline read-only shell + write banner (4-6), "Places visited" accessible list (4-7). Plus the brand app icon and bare-region navigation (4-7 follow-up).

## What went well
- **The cycle held under load.** create → dev → 3-layer adversarial review → commit ran cleanly across five stories back-to-back. The reviews earned their cost: they caught *real* AC violations, not nits — offline unmark firing a destructive write (4-6), focus not moving into the opened memory (4-7), and Serwist's `reloadOnOnline` hard-reload clobbering in-progress state (4-5).
- **Forks surfaced, not guessed.** Build tooling, install-nudge placement, offline scope, and the list shape all went through `AskUserQuestion` at the right moment instead of silent defaults.
- **Durable patterns.** A shared `useOffline()` hook; an imperative `cameraRef` that kept MapLibre confined to `features/map`; bundled gazetteer + centroids so the list works offline. Scope discipline held — outbox, prod glyph self-hosting, and the a11y floor were deferred rather than gold-plated.

## Friction / carry-forward
1. **Anon sign-in rate-limit is the dominant test blocker.** Session-gated e2e (anything that drops a pin / marks) keeps failing on the per-IP hourly cap after repeated runs — hit 4-3, 4-7, and every `dropPin` test. The deferred fix (one shared anon session via `storageState` + per-test cleanup) lives in 6-5. **Epic 2 is accounts — its tests lean on sessions even harder, and the anon→account claim is built on the anon session.** → DECISION below.
2. **Offline-awareness must reach sibling surfaces, not just the map.** The map disabled writes offline, but the memory panel (a sibling tree) didn't — caught in review. Lesson for Epic 2: session/auth state must be shared cleanly across features, not held local to one component.
3. **PWA/Serwist gotchas (captured so we don't relearn):** prod build is `next build --webpack`; `turbopack: {}` silences the dev-mode webpack-config error; `reloadOnOnline: false`; SW (`public/sw.js`) is gitignored + eslint-ignored; tile cache needs `RangeRequestsPlugin` for PMTiles 206s with a sane `maxEntries`.
4. **`region_marks` stores only an ISO code** (no name, no coordinate) — forced the bundled gazetteer (names) and centroids (coordinates) in 4-7. A recurring "the mark is just a code" friction; note for any future marks work.
5. **Icon generation ate many rounds.** Lesson if we do more AI art: anchor shapes to something real, or make the hero a structured element (the pins), rather than asking the model to freehand an organic shape.

## Action items / Epic 2 entry decisions
- [ ] **Auth method** — magic-link / Google / both? (Architecture deferred this to Simon; needed before creating 2-1.)
- [ ] **Test-session fix timing** — pull the shared-anon `storageState` test infra (6-5) in *before/with* Epic 2's session-heavy tests, or keep it deferred and accept rate-limit flakiness during Epic 2?
- Confirmed prior decision (no change): the anon uid stays stable through the claim, so no data migration debt.
