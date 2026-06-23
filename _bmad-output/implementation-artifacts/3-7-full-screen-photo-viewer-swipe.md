---
baseline_commit: 909c0f1
---

# Story 3.7: Full-screen photo viewer / swipe

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to swipe through a pin's photos full-screen,
so that I can re-live the trip.

## Acceptance Criteria

1. **Tap a photo → full-screen viewer that captures horizontal swipe.** Tapping a photo thumbnail in an open pin's memory opens a **full-screen viewer** showing that photo, and **horizontal swipe moves between the pin's photos** (the tapped photo is the starting frame). [epics 3.7 AC1; EXPERIENCE Photo viewer line 65; UX-DR9 line 89]
2. **Viewer owns gestures; pull-down / × closes; blur-up while loading.** While the viewer is open, the **sheet's vertical drag and the map's pinch-zoom are inactive** (no gesture collision — the viewer owns input). **Pull-down or the × button closes** back to the memory (panel/sheet) in the same state it was left. Each photo **blur-ups / shows a placeholder while loading** so a frame is never a blank gap (NFR4). [epics 3.7 AC2; EXPERIENCE Photo viewer line 65 + Photo loading line 84; UX-DR9]
3. **No regression; bare/absent stays calm.** The 3.6 upload flow (placeholders, per-photo retry, soft cap), 3.4/3.5 open/close/swap + note/date, and the title-only card all still work. A pin with no photos shows no viewer affordance (nothing to tap). An in-flight or errored thumbnail does NOT open the viewer (only persisted photos with a signed URL are viewable). Tapping does nothing destructive.

## Tasks / Subtasks

- [x] **Task 0 — Implementation approach (flagged for approval; see "Questions" at end)**
  - [x] **No new dependency — native CSS scroll-snap pager.** Build the viewer with a horizontal `overflow-x` + `scroll-snap-type: x mandatory` track, one full-screen `snap-center` page per photo. This natively captures the horizontal swipe (touch + trackpad), paginates, and — being a full-screen fixed overlay — inherently can't collide with the sheet drag / map pinch underneath. Avoids a carousel/lightbox dep (embla / yet-another-react-lightbox), matching the project pattern (native date input in 3.5, native canvas resize in 3.6). Recommend native; the lib alternative is the end-of-story question. NO new dep ⇒ no dev-story HALT if native is chosen.
  - [x] **Backdrop:** a near-black scrim (`bg-black/90` or similar) for photo immersion. This is a lightbox overlay convention, NOT the deferred "Lamplight" dark *theme* — v1 stays light-only for app chrome; the photo viewer on a dark backdrop is standard and fine. (Confirm in the end question.)
- [x] **Task 1 — `features/memories/components/photo-viewer.tsx` (NEW) (AC: 1, 2)**
  - [x] `PhotoViewer({ photos, initialIndex, onClose })` where `photos: { id: string; url: string | null }[]` (the persisted, signed-URL photos) and `initialIndex` is the tapped photo's index. **Render via `createPortal(…, document.body)`** so it sits above the Vaul sheet (z-20) and the panel — use a high z (e.g. `z-[60]`), `fixed inset-0`.
  - [x] **Horizontal pager:** a scroll-snap track (`flex overflow-x-auto snap-x snap-mandatory overscroll-contain`), one `snap-center w-screen h-dvh shrink-0 grid place-items-center` page per photo, image `max-h-full max-w-full object-contain`. On mount, scroll to `initialIndex` (e.g. `scrollIntoView`/`scrollLeft = index * width`, no smooth) so the tapped photo is the first frame.
  - [x] **Blur-up:** reuse the 3.6 `Thumb` pattern — a calm placeholder bg + `onLoad` opacity fade per page. Persisted photos already have a thumbnail-cached URL, so re-display is usually instant.
  - [x] **Close affordances:** an always-visible **× button** (top corner, high-contrast on the dark backdrop, `aria-label="關閉"`); **tap on the backdrop** (not on the image) closes; **pull-down to close** — a lightweight vertical-drag handler (touch + pointer) that translates/fades the viewer and closes past a threshold, only engaging when the gesture is predominantly vertical (so it doesn't fight the horizontal pager). **Escape key** closes. **← / → arrow keys** move between photos (deterministic, keyboard + testable).
  - [x] **Gesture isolation:** the overlay covers the map + sheet; stop touch/wheel propagation so nothing underneath reacts. **Lock body scroll** while open (set `overflow:hidden` on mount, restore on unmount). `role="dialog"` + `aria-modal="true"`; move focus to the close button on open and restore on close.
- [x] **Task 2 — Make thumbnails open the viewer (AC: 1, 3)** [photo-grid.tsx]
  - [x] Add `onOpen?: () => void` to `PhotoTile`. For a **`ready`** tile with `onOpen`, make the tile a button (or attach an accessible click/Enter handler) that calls `onOpen`. **`uploading`/`error` tiles stay non-opening** (error keeps its 重試; uploading is inert). Keep the existing retry + spinner behavior unchanged.
- [x] **Task 3 — Own viewer state in the uploader (AC: 1, 3)** [photo-uploader.tsx]
  - [x] Add `const [viewerIndex, setViewerIndex] = useState<number | null>(null)`. When building the **persisted** tiles (the `photos` map), set `onOpen: () => setViewerIndex(i)` with `i` = that photo's index in `photos`. Pending tiles get no `onOpen`.
  - [x] Render `{viewerIndex !== null && photos && <PhotoViewer photos={photos} initialIndex={viewerIndex} onClose={() => setViewerIndex(null)} />}`. Pass the signed-URL `photos` (id + url). Because the card is keyed by `pin.id` (3.5), the viewer state resets on pin swap.
- [x] **Task 4 — Tests (AC: all)** [e2e/memory.spec.ts]
  - [x] e2e: drop a pin, upload **two** fixture photos (await both `img[src^="http"]`), tap the first thumbnail → assert the full-screen viewer (`role="dialog"`) is visible with a photo; press **ArrowRight** → assert the second photo frame is shown (deterministic vs touch-swipe, which is unreliable in headless); press **Escape** (or click ×) → assert the viewer is gone and the memory is still open. Reuse `dropPin`/`clickPin`; mind the known anon-rate-limit + post-reload `clickPin` flakes (deferred-work.md). (Touch-swipe + pull-down gestures are validated manually; headless touch-drag on scroll-snap is flaky — note it.)
  - [x] `pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm build` green. Manual: phone — tap a photo, swipe between photos, pull-down to close; confirm the sheet doesn't drag and the map doesn't pinch while the viewer is up.

### Review Findings (code review 2026-06-23)

3 adversarial layers (Blind / Edge / Acceptance). Verdict: spec satisfied — all 3 ACs met; gesture isolation, scroll-lock cleanup, grid a11y/regression, null-url placeholder all verified clean; no new dep, light-only preserved, map/data untouched. 0 decision-needed · 4 patch · 2 defer · dismissed (rest).

**Patch:**
- [x] [Review][Patch] **Pull-to-close can get stuck (no pointer capture / cancel)** — pointer handlers never `setPointerCapture` and there's no `onPointerCancel`; a release off the (translated) overlay or an OS pointercancel leaves `dy > 0` so the viewer stays half-translated/faded. Fix: `setPointerCapture(e.pointerId)` on a vertical-committed drag + reset on `onPointerCancel` (same as pointer-up). [features/memories/components/photo-viewer.tsx]
- [x] [Review][Patch] **Drag/swipe can synthesize a backdrop click that closes the viewer** — the dialog's `onClick={onClose}` fires after a sub-threshold pull-down or a swipe ending on the letterbox. Fix: track a "moved" flag during the pointer drag and suppress the backdrop `onClose` click when a drag occurred. [features/memories/components/photo-viewer.tsx]
- [x] [Review][Patch] **Focus not restored on close** — focus moves to × on open but isn't returned to the triggering thumbnail on close (Dev Notes promised restore; only the open half shipped). Falls to `body` (WCAG 2.4.3). Fix: capture `document.activeElement` on mount, restore it on unmount. [features/memories/components/photo-viewer.tsx]
- [x] [Review][Patch] **e2e paging assertion is weak** — `toBeInViewport()` passes on any intersection, so it doesn't prove paging (frame 1 may already intersect; frame 0 may still intersect after). Fix: after ArrowRight assert frame 0 is `not.toBeInViewport()` (discriminating) or assert the track's `scrollLeft` increased. [e2e/memory.spec.ts]

**Deferred (also in deferred-work.md):**
- [x] [Review][Defer] **Capture photo `id` instead of index for the viewer** — `initialIndex` is positional; a refetch that reordered/removed photos could point at the wrong frame. Benign today (stable `sort_order, created_at`; nothing mutates the list from inside the viewer in 3.7), but capturing the id is more robust. [features/memories/components/photo-uploader.tsx, photo-viewer.tsx]
- [x] [Review][Defer] **No focus trap in the viewer** — `aria-modal` is declarative; Tab can leave the dialog to the underlying sheet/panel. Acceptable v1 lightbox cut; add a trap in an a11y polish pass. [features/memories/components/photo-viewer.tsx]

Dismissed (verified non-issues): gesture isolation is solid (portaled `z-[60]` overlay covers the z-20 sheet + map; events can't reach them); body-scroll-lock save/restore is leak-free on unmount incl. pin-swap remount; grid `ready`→button has no nested-interactive and leaves uploading/error untouched; null `url` shows a calm placeholder, not a broken frame; initial `scrollLeft` width is non-zero (`fixed inset-0`); `h-full` vs the Task's `h-dvh` is equivalent under `inset-0`; the keydown effect re-subscribing per render is harmless churn.

## Dev Notes

### What this story adds (and what it must NOT touch)
- **NEW:** `features/memories/components/photo-viewer.tsx`. **UPDATE:** `photo-grid.tsx` (tap-to-open on ready tiles), `photo-uploader.tsx` (viewer state + render). **No** data/migration/query changes — `usePhotos` already returns `PhotoWithUrl[]` with signed `url`s.
- **Do NOT** touch MapLibre / `features/map`, `data/`, the migration, or the upload pipeline. **Do NOT** add per-photo pinch-zoom-INTO-image (not in ACs — defer). **Do NOT** add a photo-delete affordance (Story 3.8).

### Current state of files being modified
- **`photo-grid.tsx`** — presentational grid built from `PhotoTile[]` (`key`, `src`, `state: ready|uploading|error`, `onRetry?`). Ready tiles currently render an inert `<img>` (the 3.6 comment literally says "Tapping a photo is inert here; the full-screen viewer is Story 3.7"). `Thumb` does the placeholder + `onLoad` blur-up. Add `onOpen?` and wire ready-tile taps; leave uploading/error untouched. [Source: features/memories/components/photo-grid.tsx]
- **`photo-uploader.tsx`** — owns `usePhotos(pinId)` (→ `photos: PhotoWithUrl[]`), the upload queue (`pending`), object-URL lifecycle, the ~30 soft cap, and builds `tiles` as `[...persisted (state:"ready"), ...pending]`. Persisted tiles map 1:1 to `photos` indices and are emitted first, so a persisted tile's position == its `photos` index — use that for `initialIndex`. Add the viewer state here and render `<PhotoViewer>`. [Source: features/memories/components/photo-uploader.tsx]
- **`PhotoWithUrl`** (from `features/memories/queries/photos-queries.ts`) = `Photo & { url: string | null }`; `url` is the signed view URL (private bucket, ~1h TTL). The viewer shows `url`; a null `url` (signing failed) shows the placeholder (no broken frame). [Source: features/memories/queries/photos-queries.ts; data/photos.ts]

### Gesture-collision resolution (the heart of AC2)
EXPERIENCE line 65 + 111: the viewer "owns the horizontal swipe, so it never competes with the sheet's vertical drag or the map's pinch-zoom (those are inactive while the viewer is up)." A **full-screen fixed overlay (portaled to `document.body`, z above the sheet)** achieves this: pointer/touch events land on the viewer, not the sheet/map beneath. Add `overscroll-contain` + stop `touchmove`/`wheel` propagation and lock body scroll so nothing underneath scrolls or zooms. The horizontal pager is the scroll-snap track; pull-down close is a separate vertical-dominant gesture so the two don't fight.

### Light-only constraint
v1 ships **light-only** app chrome (EXPERIENCE line 20; DESIGN line 148 — no theme toggle, Lamplight deferred). The viewer's near-black backdrop is a **lightbox overlay**, not a theme; it's the conventional choice for photo immersion and does not introduce the dark theme. Close/nav controls must clear contrast on the dark scrim (white icons).

### Accessibility
`role="dialog"` + `aria-modal="true"`; Escape closes; focus the × on open and restore focus on close; arrow keys navigate. This complements the "Places visited" canonical keyboard path (EXPERIENCE line 152) — the viewer itself is keyboard-operable.

### Testing standards
- e2e on the `window.__mapsakeMap` harness (`--enable-unsafe-swiftshader`). Each Playwright context = a fresh anon user under RLS; wait for the upload ack (`img[src^="http"]`) before interacting. Assert navigation via **ArrowRight/Escape** (deterministic) rather than synthetic touch-swipe/pull-down (flaky in headless). Known flakes (anon rate-limit; post-reload `clickPin`) are in deferred-work.md — re-run a flaky single test in isolation to confirm.

### Project Structure Notes
- Stays within `features/memories/components/` (architecture line 263: memories owns the memory UI incl. photos). No new module, no new dep (if native approach chosen). One NEW component + two small UPDATEs.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.7 lines 287–291; UX-DR9 line 89; NFR4 line 61]
- [Source: .../ux-designs/ux-travel-map-2026-06-16/EXPERIENCE.md Photo viewer line 65; Photo loading line 84; Gestures lines 107–114; light-only line 20; a11y line 152]
- [Source: .../ux-designs/ux-travel-map-2026-06-16/DESIGN.md light-only line 148; rounded.full line 82]
- [Source: features/memories/components/photo-grid.tsx; photo-uploader.tsx; features/memories/queries/photos-queries.ts; data/photos.ts]

### Open questions for Simon — ALL CONFIRMED 2026-06-23 ✅
1. **Native CSS scroll-snap viewer (no new dep) — APPROVED.** No carousel/lightbox library; no dev-story dependency HALT.
2. **Near-black backdrop (`bg-black/90`) — APPROVED.** Lightbox overlay, not the Lamplight dark theme; app chrome stays light.
3. **Pinch-zoom INTO a photo — DEFERRED (approved).** Out of scope for 3.7; log to deferred-work.md, do not build.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context)

### Debug Log References

- Lint (React 19 hooks rules): the `mounted`/`setMounted` SSR gate tripped `react-hooks/set-state-in-effect`, and the keydown effect referenced `pageBy` before its declaration (`react-hooks/immutability`). Dropped the `mounted` gate entirely (the viewer only renders after a user click, never during SSR, so `document.body` is always present), and inlined the arrow-key scroll into the keydown handler (no forward reference, no dep churn). Clean after that.

### Completion Notes List

- Both ACs met. New `photo-viewer.tsx`: a `createPortal`-to-`document.body` full-screen overlay (`z-[60]`, above the Vaul sheet) with a native CSS scroll-snap horizontal pager (`snap-x snap-mandatory`, `touch-action: pan-x`), near-black lightbox backdrop. Opens on the tapped photo (`scrollLeft = index * clientWidth`).
- Gesture isolation (AC2): the portaled overlay covers the map + sheet and owns input, so the sheet drag / map pinch are inactive while it's up; body scroll is locked on mount/restored on unmount. Close paths: × button, backdrop tap (image stops propagation), Escape, ←/→ arrow nav, and a pull-down-to-close pointer gesture that only engages on a predominantly-vertical drag so it doesn't fight the horizontal pager. `role="dialog"` + `aria-modal`, focus moves to × on open.
- Blur-up per frame (the 3.6 `Thumb` pattern); a null signed URL shows a calm placeholder, never a broken frame.
- Grid: `ready` tiles became buttons (`aria-label="檢視照片"`) that open the viewer at their index; uploading/error tiles stay non-opening (retry/spinner unchanged). Uploader owns `viewerIndex`; the viewer reads the signed-URL `photos`. Card is keyed by `pin.id`, so viewer state resets on pin swap.
- No data/migration/query/map changes. Native scroll-snap, no new dependency (approved).
- Validation: `tsc` clean · `pnpm lint` clean · `pnpm build` clean · new viewer e2e passes (open → ArrowRight → Escape). Full suite: 20 passed + the 1 known post-reload `clickPin` flake (date-persist), which passes deterministically in isolation (2.1s) — pre-existing, in deferred-work.md, not a 3.7 regression.
- Deferred (deferred-work.md): pinch-zoom into a photo (approved); touch-swipe + pull-down gesture e2e (manual-only — synthetic touch-drag on scroll-snap is flaky headless).

### File List

- **NEW** `features/memories/components/photo-viewer.tsx` — full-screen portal viewer (scroll-snap pager, ×/backdrop/pull-down/Escape close, arrow nav, blur-up)
- **MOD** `features/memories/components/photo-grid.tsx` — `onOpen` on ready tiles (tap opens the viewer)
- **MOD** `features/memories/components/photo-uploader.tsx` — `viewerIndex` state + render `<PhotoViewer>`
- **MOD** `e2e/memory.spec.ts` — viewer open/arrow/close test
- **MOD** `_bmad-output/implementation-artifacts/deferred-work.md` — 3.7 deferrals
- **MOD** `_bmad-output/implementation-artifacts/sprint-status.yaml` — 3-7 status

### Change Log

- 2026-06-23 — Story 3.7 implemented (full-screen photo viewer / swipe). New portaled viewer with native scroll-snap paging, gesture isolation, and ×/backdrop/pull-down/Escape/arrow close+nav; grid thumbnails open it. No new dep. Status → review.
- 2026-06-23 — Code review: 4 patches applied (pull-to-close `setPointerCapture` + `onPointerCancel` reset; suppress backdrop-close after a drag via a `dragged` flag; restore focus to the trigger on close; strengthened the e2e to assert frame 0 leaves the viewport after paging). 2 deferred (capture photo id vs index; focus trap). tsc/lint clean, viewer e2e green. Status → done.
