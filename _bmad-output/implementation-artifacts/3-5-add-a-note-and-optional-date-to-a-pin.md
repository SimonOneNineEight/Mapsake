---
baseline_commit: 0fb3ff4
---

# Story 3.5: Add a note and optional date to a pin

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to write a note and optionally set a date,
so that the memory carries context.

## Acceptance Criteria

1. **Write a note → it saves.** In an open pin's memory, a quiet "+ 寫筆記" affordance reveals a note field; typing a note **persists to `pins.note`** (durable-write: optimistic, "saved" only after server ack, retained-on-failure with a calm retry). An existing note shows as editable text. [epics 3.5 AC1; architecture#Mutations line 204; EXPERIENCE Add-detail affordances]
2. **Optional date → it saves; skipping is first-class.** A quiet "+ 加日期" affordance reveals a date picker; choosing a date **persists to `pins.memory_date`** and shows the date in zh-TW (e.g. `2022 年 4 月 5 日`). **No date is required** — skipping is first-class: no default-filled date, no "Date: —", no empty slot when absent. A set date can be changed or cleared. [epics 3.5 AC2; EXPERIENCE Date picker line 63 "Skipping is first-class … zh-TW formatting"]
3. **Card still complete with just a title.** With no note and no date, the card renders complete (the title + the quiet "+ 寫筆記 / + 加日期" invitations) — never empty slots or scolding placeholders. The affordances are present everywhere, never required. [EXPERIENCE Memory card content line 61 + Add-detail affordances line 62]
4. **Keyboard-compose (the 3.4 deferral).** On the phone sheet, focusing the note field forces the sheet to **Full** and the input is kept above the keyboard (Vaul `repositionInputs`); snap-drag is suppressed while editing so a drag scrolls the note, not the sheet. Honor iOS Safari PWA `visualViewport`/`100vh` as a known constraint (best-effort). The desktop panel is unaffected. [epics 3.4 AC2 (deferred to here); EXPERIENCE Layout line 105]
5. **No regression.** Story 3.4 open/close/swap + the selected glow, and 3.1/3.3 pin behavior, all still work. Editing one pin's note then swapping pins shows the other pin's note (no bleed).

## Tasks / Subtasks

- [x] **Task 0 — Date input: native, no new dep (scope decision)**
  - [x] Use a native `<input type="date">` for the date affordance — **avoids a new dependency** (react-day-picker / shadcn Calendar). It yields a `YYYY-MM-DD` string that maps straight to the `pins.memory_date` `date` column. (Flag at end: a prettier shadcn Calendar picker is a later option if wanted; recommend native for v1 to skip the dep.) NO Task-0 approval needed since this adds nothing.
- [x] **Task 1 — `data/pins.ts` updatePin (AC: 1, 2)**
  - [x] Add `updatePin(input: { id: string; note?: string | null; memoryDate?: string | null }): Promise<Pin>` — `supabase.from("pins").update({ note, memory_date, updated_at })...eq("id", id).select(COLUMNS).single()`. Only include the fields present in `input` (a note-only save shouldn't null the date). Set `updated_at: new Date().toISOString()` in the payload (no DB moddatetime trigger exists; a trigger is a deferred nicety). **RLS scopes the UPDATE to the owner** (`user_id = auth.uid()`) — do NOT add a `user_id` filter from client input; do NOT touch `user_id`. Returns the updated row. Resolves only on ack; throws on failure. [data-boundary; durable-write]
- [x] **Task 2 — `useUpdatePin` optimistic mutation (AC: 1, 2)**
  - [x] In `features/pins/queries/pins-queries.ts`: `useUpdatePin()` → `useMutation({ mutationFn: updatePin, … })`. `onMutate`: optimistically patch the pin in the `['pins', userId]` cache (find by id, merge the changed fields) so the note/date show immediately. `onError`: keep the edit + calm retry (no rollback — durable-write contract). `onSuccess`: invalidate `['pins', userId]` (reconcile). Mirror the `useAddRegionMark`/`useAddPin` shape. (`usePin` reads the patched pin from this cache — no `['pin', pinId]` fetch.) [architecture line 203-204]
- [x] **Task 3 — Editable MemoryCard: note + optional date (AC: 1, 2, 3)**
  - [x] `features/memories/components/memory-card.tsx` (currently title-only): keep the title; add below it:
    - **Note:** if `pin.note` is empty AND not editing → a quiet "+ 寫筆記" link (`link-quiet`: `text-[rgb(var(--terracotta-text))]`, no underline until hover). Clicking it (or an existing note) shows a `<textarea>` seeded from `pin.note`. Save on **blur** (and only if changed) via `useUpdatePin`. Show the note text when present + not focused.
    - **Date:** if `pin.memoryDate` is empty → a quiet "+ 加日期" link that reveals a native `<input type="date">`. On change, save via `useUpdatePin`. When set, show the date formatted zh-TW (`YYYY 年 M 月 D 日` — a small local formatter, NOT "Date: —" when absent) in `text-muted-foreground`, with a quiet way to edit/clear (clear = save `memoryDate: null`).
  - [x] **Never render an empty slot:** absent note/date show only as the quiet "+ add" invitations, never a label with a blank value. The card must look complete with title alone (AC3).
  - [x] A quiet **"已儲存"** indicator after a successful save (ack-gated, durable-write), and a calm retry on error (retain the edit). Reuse the minimal pattern from `MarkStatus`/Story 1.5 (don't build a heavy toast).
- [x] **Task 4 — Keyboard-compose on the phone sheet (AC: 4)**
  - [x] In `features/memories/components/memory-container.tsx`: the sheet branch passes the card an `onComposeStart`/`onComposeEnd` (or the card calls up on textarea focus/blur). On note-field **focus** (phone/<840 only): force the sheet to the **Full** snap (`setSnap(1)`) and set a `composing` flag that **suppresses snap-drag** while editing (e.g. ignore `setActiveSnapPoint` changes, or gate Vaul's drag). Set Vaul `repositionInputs` (default true) so the input pins above the keyboard. On **blur**: clear `composing` (do NOT force the snap back — leave it at Full). The desktop panel ignores compose. iOS Safari `visualViewport`/`100vh`: honor best-effort; note it.
- [x] **Task 5 — Tests + verify (AC: 1-5)**
  - [x] e2e (`e2e/memory.spec.ts` or new, `window.__mapsakeMap` harness): open a seeded pin, click "+ 寫筆記", type a note, blur → assert "已儲存" + reload → the note persists. Click "+ 加日期", pick a date → assert it saves + shows zh-TW formatted + reload persists. With no note/date, assert NO "Date: —"/empty slot (the card shows only the invitations). Swap pins → the note doesn't bleed.
  - [x] Regression: 3.4 open/close/swap + glow, 3.1 drop, 3.3 cluster still pass.
  - [x] `pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm build` green. Manual: write a note (desktop panel + phone sheet); on phone, focusing the note forces Full + the keyboard doesn't cover the field; set + clear a date.

### Review Findings (code review 2026-06-23)

3 adversarial layers (Blind / Edge / Acceptance). All 5 ACs met + architecture clean (RLS/data-boundary, durable-write, tokens, no dep/migration, MapLibre untouched), BUT Blind + Edge agree on one real swap-state bug the Auditor missed. 0 decision-needed · 2 patch · dismissed (rest).

**Patch (both applied 2026-06-23):**
- [x] [Review][Patch] **MemoryCard state bleeds across pin swaps** — `MemoryContainer` renders `<MemoryCard pin={pin} />` with NO `key`, so React reuses the instance on swap (verified: no remount). `editingNote`/`showDate` and the `updatePin` mutation state persist: opening "＋ 寫筆記" on pin A (no typing) then swapping to a note-less pin B shows an editable textarea instead of the invitation (violates AC3); and saving A then swapping to B shows "已儲存" under B (and the retry replays A's `variables`). **Fixed:** `key={pin.id}` on `<MemoryCard>` in BOTH the panel and sheet branches → remounts per pin, resetting local + mutation state. (Same id across an edit's refetch → no spurious remount.) The inner per-input `key`s are now redundant but harmless (left in place — surgical). [features/memories/components/memory-container.tsx]
- [x] [Review][Patch] **`composing` can stick true** — `setComposing(false)` only fires on note blur; closing the sheet (▾ / drag) while the field is focused leaves `composing` true, so the next open is non-dismissible until a focus+blur. **Fixed:** added a single `handleClose` (resets snap + `composing`, then `onClose`) wired to both the `▾ 回到地圖` button and `onOpenChange(false)`. [features/memories/components/memory-container.tsx]

**Post-patch validation:** `tsc --noEmit` + `pnpm lint` + `pnpm build` green; full e2e 19 passed (1 known map-render/`clickPin`-after-reload flake at memory.spec.ts:135 under 2-worker concurrency — passes deterministically in isolation; logged to deferred-work.md, not a 3.5 logic issue).

Dismissed (verified non-issues): uncontrolled textarea keeps typed text through the save→invalidate refetch (key stable by id → no remount → `defaultValue` ignored post-mount); optimistic patch + `"note" in input`/`"memoryDate" in input` partitioning correct (note-only save never nulls the date, in both data layer + hook); native `<input type="date">` `onChange` fires only on a complete/cleared value (no malformed `memory_date`, no debounce needed); `formatZhDate` is TZ-safe (pure string split, no `Date`); `repositionInputs`/`dismissible` are valid vaul props; `updatePin` never touches `user_id` (RLS-scoped); link-quiet styling matches DESIGN (none-until-hover); save-on-blur change-detection is symmetric (trimmed both sides); no MapLibre/3.4-title regression; the "19 passed" run was reproduced this session.

### Scope boundary — what 3.5 IS and is NOT
- **3.5 DOES:** the editable note (save-on-blur, durable) + the optional date (native picker, zh-TW display, skip-first-class) on the memory card; `updatePin` + `useUpdatePin` (optimistic); the **keyboard-compose** sheet state deferred from 3.4; the quiet "saved" affordance.
- **3.5 does NOT:** **photos + upload** (3.6), the **full-screen photo viewer** (3.7), **delete a pin / remove + gentle confirm** (3.8 — 3.5 only EDITS note/date; deleting the pin or a photo is 3.8), **roll-up** (3.9), GeoNames **search** (3.2 deferred). No new DB column (note/memory_date exist from the 3.1 migration); no migration.
- **Flagged decisions (end):** native `<input type="date">` (no dep) vs a shadcn Calendar (recommend native); save-on-blur (recommend) vs autosave-debounce vs an explicit button; `updated_at` set client-side (vs a DB moddatetime trigger — deferred).

### Builds on 3.1–3.4 — current state (read before editing)
- `data/pins.ts` — `Pin` has `note: string | null`, `memoryDate: string | null` (the `date` column, `YYYY-MM-DD`), `updatedAt`. `listPins` already selects all columns; `addPin` is the auth/RLS pattern to mirror (but UPDATE doesn't set `user_id`). Add `updatePin`.
- `features/pins/queries/pins-queries.ts` — `usePins()` (`['pins', userId]`), `useAddPin()` (the optimistic pattern to mirror), `usePin(pinId)` (reads from the list cache — `useUpdatePin`'s cache patch flows straight to it). Add `useUpdatePin`.
- `features/memories/components/memory-card.tsx` — currently `<h2>{pin.name}</h2>` only. This story adds the note + date affordances below the title. Keep it title-complete when both are absent.
- `features/memories/components/memory-container.tsx` — the responsive panel (≥840) / Vaul sheet (<840). It owns the sheet `snap` state (`[0.5,0.85,1]`, reset to 0.5 on close). Add the compose wiring (force Full + suppress drag on note focus, phone only). The desktop `<aside>` panel needs no compose handling.
- The CSS var `--terracotta-text` (= `158 79 43`, #9E4F2B) exists (used by Story 1.5's MarkStatus as `text-[rgb(var(--terracotta-text))]`) — use it for the link-quiet "+ add" affordances. `--primary` is the same value (button bg).

### Durable-write + data contracts
- **`updatePin`** mirrors the durable-write contract: resolves on ack, throws on failure. RLS (`pins_owner_update`, from the 3.1 migration) scopes the UPDATE to the owner — never trust client `user_id`. Set `updated_at` in the payload (no trigger).
- **`useUpdatePin`** optimistic: patch the cached pin so the note/date render before ack; "已儲存" appears only after ack (durable-write); on failure retain the edit + calm retry (no rollback) — same posture as `useAddRegionMark`/`useAddPin`. Invalidate `['pins', userId]` on success. [architecture line 203-204]
- **Save trigger:** the note saves on **blur** (only if changed) — calm, no save button, no per-keystroke writes. The date saves on change. "Add details later" is never a gate. [EXPERIENCE Add-detail affordances]

### Keyboard-compose (EXPERIENCE line 105)
- Phone sheet only. Focusing the note `<textarea>` → force the sheet to **Full** (so the field has room above the keyboard) + suppress snap-drag while editing (a drag scrolls the note, not the sheet). Vaul `repositionInputs` (default on) lifts the focused input above the keyboard. iOS Safari PWA `visualViewport`/`100vh` is a known build constraint — keep the field visible; best-effort, flag any gap.
- The card lives inside the container; the container owns `snap`, so the card signals focus/blur up to the container (a prop callback) which drives `setSnap(1)` + the `composing` flag.

### Architecture compliance (guardrails)
- **Data boundary:** `updatePin` lives in `data/pins.ts` (the only Supabase importer for pins); the card uses the `useUpdatePin` hook, never raw Supabase. snake_case (`note`, `memory_date`, `updated_at`) stays in `data/pins.ts`; camelCase above. [line 281]
- **MapLibre stays in `features/map`** — this story is all `features/memories` + `data`/`features/pins`; no map changes (the glow/selected from 3.4 are untouched). [line 283]
- **UI state minimal** — the note/date editing + compose flags are local React state (no new store). [line 203]
- **Tokens** via theme (`text-[rgb(var(--terracotta-text))]`, `text-muted-foreground`, `bg-card`); no hardcoded hex. zh-TW inline strings until i18n (Story 6.1). No new dependency (native date input).

### Conventions
Flat repo; feature-first; Tailwind v3, light-only, zh-TW primary. No Co-Authored-By; pnpm. snake_case DB ↔ camelCase domain at `data/` only.

### Testing standards
- e2e (Playwright, `e2e/`, `window.__mapsakeMap` harness + swiftshader): open a seeded pin (per-anon-user RLS — seed in the test's own session via the 3.1 drop flow), edit the note + date, wait for the ack ("已儲存") before reload (Story 1.6/3.3 lesson), assert persistence. Assert the absent-state shows no empty slots.
- Manual: phone keyboard-compose (focus forces Full, field stays above the keyboard); date set + clear; the swap-no-bleed.

### References
- [Source: epics.md#Epic 3 › Story 3.5 (note saves; date saves; skipping first-class)]
- [Source: architecture.md#State & Data (TanStack Query, `['pins', userId]`/`['pin', pinId]`, durable-write line 204), #Data (pins.note/memory_date), #feature-first (data boundary line 281, MapLibre line 283)]
- [Source: EXPERIENCE.md Memory card content (line 61 title-complete), Add-detail affordances (line 62 quiet "+ add", never required), Date picker (line 63 skip-first-class + zh-TW), Layout line 105 (keyboard-compose: force Full + disable snap-drag + visualViewport)]
- [Source: DESIGN.md#link-quiet (terracotta-text #9E4F2B, none-until-hover), #terracotta-text token; app/globals.css `--terracotta-text`]
- [Source: 3-1 (data/pins.ts, addPin pattern, the pins migration note/memory_date columns + pins_owner_update RLS), 3-4 (memory-card.tsx title-only, memory-container.tsx panel/sheet + snap state), 1-5 (MarkStatus saved/retry pattern, --terracotta-text usage)]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context) — create-story + dev-story

### Debug Log References

- **`page.getByDisplayValue` is not a Playwright API** (it's Testing Library). The note-persist assertion used it → `TypeError`. Fixed to `getByPlaceholder("寫下這個地方的回憶…").toHaveValue(...)`.
- **Supabase anonymous-sign-in rate limit (verification blocker).** The full browser e2e suite times out with `[mapsake] anonymous sign-in failed: Request rate limit reached`. Each Playwright context = a fresh anon user = a `signInAnonymously` call; this session's many heavy e2e runs exhausted Supabase's per-IP hourly anon-sign-in cap, so new contexts can't get a session → the tap is gated on `userId` → 30s timeouts. **Not a 3.5 defect** — the `set an optional date …` e2e PASSED in isolation before the cap was hit (proving the `updatePin`/`useUpdatePin` durable-write path + the date affordance + persistence + the harness); the note path is identical. Restarting the dev server didn't help (server-side cap). Resets over time / CI uses a fresh IP + `workers:1`. Logged a fix (reuse one anon session across the suite) in deferred-work.md.
- Capped Playwright `workers: process.env.CI ? 1 : 2` — >2 concurrent software-WebGL (SwiftShader) maps starve the CPU + dev server. (Independent of the rate limit, but a reliability improvement.)

### Completion Notes List

- **`updatePin`** in `data/pins.ts`: `UPDATE pins SET note/memory_date/updated_at WHERE id` — only the fields present in `input` are written (note-only save won't null the date), `updated_at` stamped client-side, RLS (`pins_owner_update`) scopes to the owner (no client `user_id`), returns the row.
- **`useUpdatePin`** (optimistic): patches the pin in the `['pins', userId]` cache (so `usePin` re-derives instantly), retain-on-error + calm retry, invalidate on ack.
- **Editable MemoryCard**: a "+ 寫筆記" link-quiet reveals a `<textarea>` that saves on blur (only if changed); a "+ 加日期" link reveals a native `<input type="date">` that saves on change, shows the date zh-TW (`YYYY 年 M 月 D 日`), and is clearable. Absent note/date render only as the quiet invitations — no empty slots, no "Date: —". A quiet ack-gated "已儲存" + a calm retry on failure. Tokens via `--terracotta-text`/`text-muted-foreground`. `key`-by-pin.id on the inputs → no bleed across swaps.
- **Keyboard-compose**: the phone sheet forces Full (`setSnap(1)`) on note focus, becomes non-dismissible while composing, and sets Vaul `repositionInputs` (lift the field above the keyboard). Desktop panel unaffected.
- **No new dependency, no migration** (note/memory_date columns exist from 3.1). MapLibre untouched.
- **Verification:** `tsc --noEmit` 0, `pnpm lint` 0, `pnpm build` 0. **Full e2e suite: 19 passed** (re-run once the Supabase anon rate limit reset) — incl. the 3.5 note-saves/persist, date-saves/zh-TW/persist, and swap-no-bleed tests, plus the 1.5/1.6/3.1/3.3/3.4 regressions. (The earlier `Request rate limit reached` failures were purely the exhausted per-IP anon-sign-in cap, now confirmed.)

### File List

**Modified**
- `data/pins.ts` — `updatePin(id, note?, memoryDate?)`
- `features/pins/queries/pins-queries.ts` — `useUpdatePin` (optimistic) + `UpdatePinInput`
- `features/memories/components/memory-card.tsx` — editable note + optional date + saved indicator (was title-only)
- `features/memories/components/memory-container.tsx` — keyboard-compose wiring (force Full + non-dismissible on note focus; `repositionInputs`)
- `e2e/memory.spec.ts` — note-saves, date-saves, swap-no-bleed tests
- `playwright.config.ts` — `workers` cap
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 3.5 → in-progress

### Change Log

- 2026-06-22 — Story 3.5 context created (ready-for-dev): editable note + optional date on the memory card; native date input (no dep); keyboard-compose deferred from 3.4.
- 2026-06-22 — Implemented → review: `updatePin` + optimistic `useUpdatePin`; editable MemoryCard (note save-on-blur, optional native date, zh-TW display, skip-first-class, ack-gated "已儲存"); phone keyboard-compose (force Full + repositionInputs). No dep/migration. tsc/lint/build green; date e2e verified in isolation. Full e2e suite was blocked by the Supabase anon-sign-in rate limit (transient, per-IP/hour); logged a one-anon-session suite fix in deferred-work.
- 2026-06-23 — Rate limit reset → **full e2e suite re-run: 19 passed** (note/date/swap + all regressions). Story fully verified.
