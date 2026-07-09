---
title: "EXPERIENCE.md — Mapsake v2 (native iOS)"
status: final
created: 2026-07-02
updated: 2026-07-09
sources:
  - ../../prds/prd-travel-map-2026-07-02/prd.md
  - ../ux-travel-map-2026-06-16/EXPERIENCE.md
  - mockups/voice-guide.md
  - mockups/capture-flow-prototype.html
---

# Mapsake v2 — Experience Spine

> How the native iOS app works. Visual identity lives in `DESIGN.md` (tokens referenced as `{path.to.token}`). Product scope, FR/NFR numbers, and the journeys (UJ-1…UJ-4) are the PRD's — inherited, not restated. When any mock conflicts with these spines, the spines win. Behavioral reference: `mockups/capture-flow-prototype.html` — 14 tap-through frames, Simon-approved 2026-07-08.

## Foundation

**Native iOS, SwiftUI, iPhone-first (~390pt reference width).** The UI system is native SwiftUI: iOS defaults (navigation, gestures, date wheel, share/permission sheets, haptics) are inherited; the spines specify only the Mapsake delta. `DESIGN.md` is the visual reference. SwiftUI is written **adaptively** so a later iPad layout pass is possible, but no iPad-optimized layouts ship in v2 (PRD §6).

**zh-TW is the first language of every surface** (FR28); English is post-v2. The uplift over v1 is **experience, not look** — capture friction was the pain; the flows below are the answer. The v1 web app stays running as the try-before-you-install front door; this app is the retention surface.

**Signed-in-first:** there is no anonymous mode. First run = warm intro → one-tap sign-in → guided first memory → contextual notification ask (UJ-4).

## Information Architecture

Three-tab bottom bar (`{components.tab-bar}`) — first-class, labeled navigation (FR19; v1's hidden-button mistake is the anti-pattern):

| Surface | Reached from | Purpose |
|---|---|---|
| 地圖 (home) | Tab 1 · cold open | Full-bleed read-only map framed to the saved default view (world by default). Region-count clusters, standard pins, the floating search pill (搜尋地點，記錄回憶), long-press capture entry. |
| 去過的地點 | Tab 2 | The collection, organized geographically: continent → country → region → place (FR20), with in-collection search on top (FR21). Tap dives to the map. |
| 設定 | Tab 3 | Designed settings + the account surface (FR26): profile card, 通知 (one coherent control surface, FR17), 地圖 (預設畫面), 資料 (匯出我的回憶 / 刪除帳號), quiet 登出. |
| Capture flow (modal) | Search pill · long-press · 記錄下個地點 loop | The ritual: search → fine-tune pin → date → photos → save moment → loop or recap. One forward-moving modal stack over the map. |
| Session recap | Explicit 完成這次記錄 in the loop | The session's payoff beat (FR12): everything just logged, then 看看地圖. |
| Re-live landing | Notification deep-link (FR15) | Map flies to THAT DATE's visit; pin glows; bottom sheet opens the visit: photos, note, cohort chip. |
| Lock-screen notification | System surface (FR14) | Photo-rich card: 「N 年前的今天：{place}」 + 點開重溫這段回憶 + the memory's photo thumbnail — the photo earns the tap. |
| First-run | Install only | Intro brand moment → 登入 → guided first memory (= the capture flow itself) → recap → 通知 pre-prompt. |

Modal depth stays shallow: the map is always one dismissal away. No drawer, no hidden surfaces.

→ Composition reference: `mockups/capture-flow-prototype.html` frames 1–14. Spines win on conflict.

## Voice and Tone

**The locked 語感 voice guide is the microcopy contract: `mockups/voice-guide.md`** (LOCKED 2026-07-08 — vocabulary table, register, sentence patterns, don'ts). This section summarizes; the guide governs.

- **Register:** warm, plain, spoken Taiwan Mandarin — the register of a good LINE message from a thoughtful friend (LINE (TW) is Simon's named anchor). **你, never 您.** Particles (吧/囉/呢) at most one per screen. No exclamation marks except genuine celebration; errors never.
- **Reference tone (Simon-approved):** 「開啟通知，重溫你的旅行」 — imperative + benefit, 4+4 rhythm, never a soft question.
- **Master calibration:** poetry lives in positioning (App Store, the intro's 「你的私人旅行時光膠囊」); the UI speaks plain. The save *animation* carries the ritual emotion; the copy stays light.
- **Arbitrated vocabulary (binding):** capture verb **記錄** · place confirm **選擇地點** · photos **上傳** · promise verb **重溫** (re-live surfaces only) · a memory **回憶** · a visit **第 N 次** (pin/re-live surfaces, NOT recap rows) · save success **已儲存** everywhere · the place noun **地點** app-wide (地方 is superseded; v2 deliberately diverges from v1) · browse surface **去過的地點** · date question **「哪一天去的呢？」**.
- **Pattern rules from Simon's prototype corrections:** buttons name the concrete action; no reassurance copy where a control belongs; one skip affordance per screen; internal jargon (反查地址) never surfaces.
- **Moment patterns:** invitations = imperative + benefit; confirmations = short state (已儲存); empty states = invitation, not apology; errors = calm, blame-free, next-step-first, no 錯誤/失敗 nouns; permission pre-prompts = context + benefit in one line, then the OS speaks; destructive confirms name the thing and the consequence plainly, no guilt.
- **Don'ts:** no 「…以…」 in-order-to syntax, no transliterated English metaphors, no business-letter register, no 「要不要…？」 CTAs, no 「已達…上限」 system-speak. The test: would LINE ship it?

**Process contract (PRD FR28):** every new zh-TW string is drafted against the guide and **reviewed by Simon before implementation**. Strings in mockups ship as candidates, marked until blessed. Copy in this spine that appears in the approved frames is approved-in-context; anything new remains a candidate.

## Component Patterns

Behavioral. Visual specs live in `DESIGN.md.Components`.

| Component | Use | Behavioral rules |
|---|---|---|
| Read-only map | 地圖 | **Tap always reads, never writes** (FR3): tap a pin → open its memory; tap a cluster → dive into that region. The visited fill is fully derived (memories ∪ legacy web marks, read-only on iOS). The **only** map write gesture is the deliberate long-press → 在這裡記錄回憶 → fine-tune step. Region marking as a user action does not exist on iOS. |
| Search pill | 地圖 | The capture front door (FR4): 搜尋地點，記錄回憶. Tap → search screen. |
| Search | Capture step 1 | One box, place names (zh-TW-first) **or pasted street addresses** (helper: 地點名稱或地址都可以). Result rows: name + region sub-line; a visited place shows 「你去過 N 次」. Tap a result → fine-tune. 取消 returns to the map. Search doubles as browse (FR21): a visited result jumps to its pin. |
| Fine-tune pin | Capture step 2 (from search or long-press) | Map centered on the spot; **draggable 44pt pin** with hint 按住拖曳微調; sheet shows the place name + reverse-geocoded address as plain text (never the word for the mechanism). Confirm = **選擇地點**; secondary = quiet 重新搜尋. Confirming creates the **visit** on the (possibly existing) pin — multi-visit per FR6. |
| Date step | Capture step 3 | Serif question 「哪一天去的呢？」 + sub `{place} · 第 N 次`. **Chips are true shortcuts only:** the previous place's date in this session (「5 月 17 日 · 上個地點」 — consecutive places in a trip share dates; the session is the suggestion source) + 今天. The iOS date wheel below IS the any-other-date path (no 選其他日期 chip). Date optional (FR7): quiet 略過 is the one skip. Primary: 下一步：上傳照片. |
| Photo step | Capture step 4 | **Date-suggested grid** (FR8): heading 「{M 月 D 日}的照片」, sub with count + scope (e.g. 從你的照片圖庫找到 12 張 · 全部照片). Photo-library permission asked contextually at first attach; full or limited honored (limited: suggest within the user's subset, easy manage-selection). Suggestions on-device; **nothing auto-attached** — tap to select (check tile). The **＋其他照片 tile** in-grid opens the full picker (a control, not a caption). **Below the grid: the note field** (Simon, 2026-07-09) — a quiet optional one-line field 「想寫點什麼…」 (candidate copy) that expands as the user types; the note saves onto **this visit** (FR9), giving the re-live moment its words. One screen serves photos + words; skipping costs nothing. Primary: 上傳（N 張照片）; skip: 不加照片，直接記錄. Uploads inherit v1 pipeline policy (resize ~2048px, caps phrased per the guide: 每個地點最多 N 張). |
| Region backfill | Capture, via search (FR11) | Searching a **region or country** (北海道, 日本) offers 「記錄這個地區」 (candidate copy) alongside place results → creates the visit on an **approximate pin** at the region's center (`{components.pin-marker}` fill-approximate: dashed, hollow — honest imprecision). The region colors visited immediately. The pin upgrades to a standard marker when dragged to a real spot later (FR29 edit path). One write model: everything is a pin. |
| Save moment | Capture step 5 (FR10) | Pin **settle** animation (falls, lands, springs: `.7s cubic-bezier(.2,.8,.3,1.1)`) + **ripple** ring (`.9s` ease-out, `.45s` delay) + light haptic; toast 已儲存; serif line `{place} · 第 N 次`. Reduce Motion → no animation, no ripple; toast + state change only. The save moment shows only after the write is acknowledged (NFR4). |
| Capture loop | After save (FR11) | Two choices: **記錄下個地點** (→ search; the session carries the previous date as a chip) or ghost **完成這次記錄** (→ recap). Run light — skip date, skip photos — this same loop IS backfill: rapid name-only memories, each still coloring its region. |
| Session recap | Explicit end (FR12) | Serif 「你記錄了 N 個地點」, warm factual sub (e.g. 2026 年 5 月的京都之旅，已經在你的地圖上了), a card of rows: place · date · photo count — **no 第 N 次 in recap rows** (Simon: clutter). CTA 看看地圖 → the map, newly settled. |
| Cluster pins | 地圖 zoomed out (FR2) | Cluster **by geography, not proximity**: one aggregate pin per region/country carrying its memory count (「12 個回憶」). Tap → dive into the region. Close zoom shows individual pins. |
| Pin sheet | Tap a pin | Opens the pin's memory in a bottom sheet over the map (map stays visible — never a takeover). **Multi-visit anatomy:** the sheet opens on the **most recent visit** (its date line, photos, note); other visits render as a compact history below — one row per visit (「2024 年 11 月 · 第 2 次 · 5 張照片」), tap to swap the sheet's content to that visit. A deep-link (re-live) opens the **targeted** visit instead. Single-visit pins show no history block (absence is normal). |
| Re-live sheet | Notification deep-link (FR15) | Sheet on the glowing map: serif place name; terracotta `{typography.context-line}` 「N 年前的今天 · {full date} · 第 N 次」; **that visit's** horizontal photo strip (`{components.photo-strip-tile}`, swipeable); that visit's note; cohort chip 「這天還有 N 個回憶 →」 (FR16); quiet ⋯ overflow where mute lives. |
| Geographic browse | 去過的地點 (FR20) | Continent section labels (亞洲/歐洲) → country rows (flag, 「12 個回憶 · 3 個地區」) → expand in place → region rows with place-name previews (「清水寺 · 金閣寺 · 嵐山竹林 +4」) → tap dives to the map. Search field pinned on top (搜尋你去過的地點). |
| Notification controls | 設定 › 通知 (FR17) | ONE coherent surface (v1 shipped two contradictory controls): 回憶通知 toggle with delivery-time sub (每天傍晚 7:00, changeable) + 靜音的地點 list (N 個地點). |
| Settings | 設定 (FR26/FR30) | Profile card (avatar, name, email · sign-in method); grouped sections 通知 / 地圖 (預設畫面：整個世界) / 資料 (匯出我的回憶; 刪除帳號 in `{colors.destructive}`) / **語言 (static 繁體中文 — becomes a picker when English ships post-v2, per FR26/FR28)**; quiet text 登出. Account deletion warns plainly that the same map disappears from the web app too. |
| Sign-in | First run (FR23) | Apple (black, first) / Google / Email (ghost) full-width buttons; reassurance 「你的地圖會安全地保存，換手機也不會不見。」; returning-web-user steering 「用過網頁版的 Mapsake？用同一種方式登入就好。」. Sign-in lands directly in search: **the guided first memory IS the capture flow** — no separate onboarding capture UI. |
| Notification pre-prompt | Post-first-memory (FR24) | A mini preview of the future notification **with the user's own just-logged place in it**; headline 「開啟通知，重溫你的旅行」 (Simon-approved); sub 「明年的今天，Mapsake 會把這段回憶帶回來給你。」; 開啟通知 → the one-shot OS prompt; quiet 先不用. |
| Edit / remove | Pin + visit surfaces (FR29) | v1 posture carries: edit pin name, visit date/note, add/remove photos, delete visit, delete pin — calm single confirm for content-bearing deletions, naming the thing and the consequence (…此動作無法復原). Surfaces not yet framed — see open items. |

## State Patterns

Principle carried from v1: **absence is normal, never a failure.** No "0 photos", no empty slots, no completion nags.

| State | Surface | Treatment |
|---|---|---|
| Saving | Capture | Durable-write posture (NFR4): in-progress state (儲存中 — candidate copy, unblessed) until the server acknowledges; only then 已儲存 + the save moment. Never claim saved before it is. |
| Save failure | Capture | The entry is retained; calm inline retry, next-step-first (「這次沒能儲存，稍後再試一次。」-register — candidate). Never a loss message, never 錯誤/失敗 nouns, never red fills. |
| Photo upload | Capture / pin sheet | Per-photo quiet progress with immediate placeholders (v1 pattern); per-photo failure → calm inline retry, never a blocking modal. The card never looks broken mid-upload. |
| Empty states | Anywhere | An invitation, not an apology — v1's model line, with the 地點 noun sweep applied. Name-only memories render complete: no date row when there's no date. |
| Offline | App-wide (FR31) | **Read-only, calmly said:** previously viewed map, pins, memories, photos stay browsable. Capture and sync need a connection; write affordances say so quietly — never a hard wall or a silent failure. |
| Muted place | Re-live engine | Never notifies; fully visible on the map. Managed in 設定 › 靜音的地點; mute action lives in the re-live sheet's ⋯ overflow. |
| Contentless backfill memory | Map + engine | Colors its region visited immediately; down-weighted/excluded from re-live until it gains content (FR13) — a batch backfill never floods the capsule. |
| Notification without photo | Lock screen | Graceful text-only fallback per APNs constraints (NFR2) — same copy pattern, no broken image. |
| Reduce Motion | Save + re-live | Save: no settle/ripple, toast + state only. Re-live: glow pulse becomes a static soft halo (~40% opacity); fly-to degrades to a gentle fade-in. Same content always lands. |
| Permission states | Photo step | Full access → library-wide suggestions; limited → suggestions within the subset + a visible manage-selection affordance; denied → manual picker path only, no nagging. |
| Export | 設定 › 資料 | Request → preparing → ready; framed as the trust guarantee (the memories are yours to take). v1 flow carries; v2 screens not framed. |
| Sign-in states | First run (FR23) | **Email magic link:** after sending, a calm wait state — 「看看你的信箱」 (v1-approved line) with the address shown; returning to the app after tapping the link resumes into the guided first memory. **Apple/Google cancel or failure:** quiet return to the sign-in screen, no error prose, buttons re-enabled. Never a dead end. |
| Search states | Capture step 1 | **No results:** an invitation, not an apology — offer the manual path (「找不到？長按地圖，直接把圖釘放上去」 — candidate). **Geocoding failure (network):** calm inline retry per the error pattern. Search never blocks capture — long-press always works. |
| Zero-memory states | 地圖 / 去過的地點 | A brand-new (or fully-emptied) map renders the bare world + the search pill as the standing invitation; 去過的地點 empty state invites the first memory (candidate: 「記錄第一個地點，你的地圖就從這裡開始。」). Reachable outside first-run (capture 取消); never assumes onboarding context. |

## Interaction Primitives

- **Tap = read, always.** Opening, diving, browsing. A tap can never create, mark, or destroy anything on the map (FR3).
- **Long-press = the one deliberate map write** — 在這裡記錄回憶, straight into fine-tune.
- **Drag** the fine-tune pin to nudge placement — with a **non-drag equivalent always available**: tapping anywhere on the fine-tune map moves the pin there (single-pointer alternative, WCAG 2.5.7); **drag** sheets by the grabber.
- **Sheet grammar:** every memory/re-live landing is **map + memory together** — the sheet opens partial with the glowing map visible above; full-screen is user-chosen by dragging up, never the landing state (v1 hard rule, carried). Exact SwiftUI detent set is an open item; v1's three-snap model (half ≈ 45–55% landing / expanded / full) is the reference.
- **Horizontal swipe** moves through photo strips; tapping a photo opens the full-screen viewer, which **owns swipe and pinch-to-zoom** (FR22) so photo gestures never collide with sheet-drag or map-pan.
- **Save animation** (FR10): settle + ripple + light haptic, per the timings in Component Patterns; **Reduce Motion → none**. The animation is the ritual — it carries the emotion the copy deliberately doesn't.
- **Re-live glow:** `{colors.glow}` pulse on the landed pin (`2.2s` ease-in-out loop, scale .9→1.35, opacity .5→.15); Reduce Motion → static halo.
- **No frame jolts, ever:** focusing an input, opening a sheet, or transitioning screens never scales or jumps the viewport (the elevated v1 gripe). Inputs ≥ 17pt (`{typography.input}`).
- **One skip affordance per screen** — a single quiet button; skipping is first-class, required fields don't exist on a memory (date optional per FR7).
- **Banned:** feeds, streaks, completion percentages, scarcity/expiry mechanics, engagement nags, slideshow-takeover landings, badge counts, invented occasions.

## Accessibility Floor

NFR8, natively. Contrast values live in `DESIGN.md.Colors` (recomputed table; note the one flagged failing pair).

- **VoiceOver everywhere:** every interactive element labeled with role + state — pins announce place name + visit count; clusters announce 「N 個回憶」+ region; photo tiles announce selection state; the save moment announces 已儲存. 去過的地點 is the canonical screen-reader browse path for the map's content (v1 pattern, now a first-class tab).
- **VoiceOver reading order + focus management (per surface):**
  - *Re-live deep-link:* focus lands on the sheet's place-name heading (heading trait); order = heading → context line → photo strip → note → cohort chip → ⋯ → then the map behind.
  - *Capture steps:* each step change announces its serif question/heading first (heading trait); the primary action is last in order; the quiet skip precedes it.
  - *Map:* clusters then pins are traversable accessible elements (prominence order); the search pill precedes them. The **search pill is the designated accessible capture path** (fine-tune drag/tap has VO nudge actions — adjustable up/down/left/right — but search-precision placement never *requires* map interaction).
  - *Serif titles* carry heading traits everywhere; grouped-list section labels are headers.
- **Dynamic Type including zh-TW scaling:** all roles map to iOS text styles and scale; CJK line-height floors (≥1.4 wrapping) hold at large sizes. Per-surface rules: chips wrap to multiple lines rather than truncate; the tab bar provides the **Large Content Viewer** at AX sizes; cluster-count text scales to a cap (the bubble grows to fit; VO carries the full label beyond it); recap and browse rows reflow to two lines; the photo grid never shrinks tiles below 44pt.
- **Reduce Motion honored** — explicitly including the FR10 save animation and the re-live glow/fly-to (fallbacks specified above).
- **AA contrast** on the parchment palette: text ≥ 4.5:1, meaningful non-text ≥ 3:1 (verified in `DESIGN.md` — the one prototype failure, the selected chip, is resolved to ink text; AA is the ceiling — no AAA over-build).
- **Touch targets ≥ 44pt** — cluster pins (visual 40px, padded hit), photo-grid checks, **chips (padded hit, visual height unchanged), the re-live ⋯ overflow (rendered at 44pt), and the notification toggle (the entire settings row toggles)**.
- **Keyboard & focus:** the search field auto-focuses on entry from the search pill; return key = search; a visible focus indicator (2px `{colors.terracotta}` ring — the v1 `--ring` carried) marks focused fields (fields otherwise sit at ~1.1:1 boundary contrast, so the ring is load-bearing); Full Keyboard Access order follows the VO order above.
- **Visited state never color-alone:** terracotta + the always-on hatch texture, zoom-stable, with the small-region pin fallback (carried v1 spec).

## Key Flows

The journeys and protagonists are the PRD's: Simon (UJ-1–3), 雅婷 (UJ-4).

### UJ-1 — Logging the trip (the capture ritual) — Simon

Home a week after Kyoto, camera roll full. Capture is a post-trip ritual, not an in-trip chore.

1. 地圖 → search pill 搜尋地點，記錄回憶 → types 清水寺 (name or pasted address both work); result row shows 「你去過 2 次」.
2. Fine-tune: map on the spot, drag to nudge, plain-text address preview → **選擇地點**.
3. 「哪一天去的呢？」 — taps the 「5 月 17 日 · 上個地點」 chip (session suggestion) or 今天, or spins the wheel; 略過 stays quiet.
4. 「5 月 17 日的照片」 — date-suggested grid, taps three, ＋其他照片 if the suggestions miss; a line in the note field if the moment asks for words (想寫點什麼…) → 上傳（3 張照片）.
5. **Save moment:** pin settles, ripple, haptic, 已儲存, 「清水寺 · 第 3 次」.
6. **記錄下個地點** → straight back to search; the session date rides along as a chip. Repeat, seconds per place.
7. **完成這次記錄** → recap: 「你記錄了 4 個地點」, rows of place · date · photo count → 看看地圖.
8. **Climax:** the trip visibly settled into his map — a pleasure, not data entry (SC1).

Failure path: a save that can't reach the server keeps the entry and offers a calm retry — the loop never loses work (NFR4).

### UJ-2 — The re-live moment (the soul) — Simon

1. A random evening, 7:02pm. Lock screen: Mapsake card — 「2 年前的今天：清水寺」, 點開重溫這段回憶, **the memory's photo thumbnail** (the tap-earner, FR14).
2. He taps. Deep-link (FR15): the map **flies to the pin**, which **glows** with the soft `{colors.glow}` pulse (Reduce Motion → static halo + fade).
3. The sheet opens on **that date's visit**: 清水寺, terracotta context line 「2 年前的今天 · 2024 年 7 月 9 日 · 第 2 次」, THAT visit's photo strip and note.
4. He swipes the photos, reads his own line back. 「這天還有 2 個回憶 →」 offers the day's cohort (FR16); ⋯ quietly holds mute.
5. **Climax:** a moment he hadn't thought about in two years is back — unprompted, specific, his. He closes the app satisfied. No feed, no streak; the satisfaction is the retention (SC2).

### UJ-3 — The deliberate visit (the browse) — Simon

1. A quiet moment. Opens to 地圖 at his saved default view and wanders — clusters read 「12 個回憶」 at world zoom; tapping one dives in.
2. Or 去過的地點: 亞洲 → 日本 (12 個回憶 · 3 個地區) → 京都府 (清水寺 · 金閣寺 · 嵐山竹林 +4) → tap → the map dives to it.
3. Or searches a visited place — the 「你去過 N 次」 row jumps straight there (FR21).
4. Photos open into the full-screen viewer: fast, swipeable, pinch-to-zoom (FR22).
5. **Climax:** the collection reads like an atlas of his life, reachable in two obvious taps — never behind an unlabeled button (FR19).

### UJ-4 — The first run — 雅婷

1. Installs, opens: the **brand moment** — pin mark, Mapsake, 「你的私人旅行時光膠囊」 (the one poetry-allowed surface), the two-line promise 「把去過的地點記錄在你的地圖上。／某個傍晚，回憶會自己回來找你。」 (approved-in-frame), page dots, 開始.
2. **登入** (signed-in-first, FR23): Apple first, Google, Email; 「你的地圖會安全地保存，換手機也不會不見。」; web users steered to their original method.
3. Sign-in lands **directly in search**: the guided first memory IS UJ-1 in miniature — a place she loves, a date, a few photos, maybe a line, the save moment, the recap.
4. Only now, the **notification pre-prompt** (FR24): a mini preview of a future notification with *her own place* in it, 「開啟通知，重溫你的旅行」, 「明年的今天，Mapsake 會把這段回憶帶回來給你。」 → 開啟通知 fires the one-shot OS prompt; 先不用 stays quiet.
5. **Climax:** she leaves with one real memory locked in and a reason to return in a year (SC4).

Failure path: declining notifications changes nothing else — the pre-prompt never nags again from this flow; the toggle waits in 設定 › 通知.

## Open Items

Shared list with `DESIGN.md.Open Items` (visual items live there). UX-specific, owned forward:

- **SwiftUI sheet detent set** — v1's three-snap model is the reference; exact `presentationDetents` decided at build.
- **Edit/remove entry points (FR29)** — behavior specified above; surfaces unframed (likely the pin sheet's ⋯ / long-press on rows — decide at build or a UX touch-up).
- **Graduated re-live curation (FR17)** — deferred beyond binary mute; the ⋯ overflow reserves the spot. Post-v2 refinement (decision log 2026-07-08).
- **Intro pages 2–3 content**; **settings sub-screens** (靜音的地點 list, export states, deletion confirm) — behaviorally specified, visually unframed.
- **Candidate copy awaiting Simon's blessing (FR28):** 儲存中, error/retry lines, 想寫點什麼…, 記錄這個地區, search no-results line, zero-memory empty states, rediscovery-tier notification copy.
- **Simon's v1 gripes sweep** — never declared complete; sweep once more before the SwiftUI build starts.
- **Widget UX (FR18)** — only if epic planning votes it in.
