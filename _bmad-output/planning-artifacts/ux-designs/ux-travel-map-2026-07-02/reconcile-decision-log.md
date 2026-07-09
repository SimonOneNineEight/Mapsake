# Reconciliation — Decision Log vs. Spines (DESIGN.md + EXPERIENCE.md)

Date: 2026-07-08 · Source of truth checked: `.decision-log.md` + `.working/voice-guide.md` · Outputs checked: `DESIGN.md`, `EXPERIENCE.md` (both `status: draft`, updated 2026-07-08).

**Verdict: 1 resolved decision did not land (the approximate-pin backfill model — the log itself predicted this gap); everything else in the log, including all Simon copy corrections and all three qualitative soul items, is verifiably present in a spine or consciously absent. Two hygiene issues: dangling `mockups/` source paths (promotion not done) and stale rejected-copy examples inside the locked voice guide.**

---

## 1. Verification matrix — every logged decision

### 2026-07-08 — Visual direction (brain dump)

| Decision | Landed? | Where |
|---|---|---|
| Visual identity carries over from v1 (palette + typography stay; iOS deltas only, no re-imagining) | YES | DESIGN.md frontmatter comments ("carried from v1 BY DECISION"), preamble ("v1's identity inherited + iOS-native adaptation deltas — no re-imagining"), Brand & Style ("the visual language evolves, the soul doesn't"). Deltas explicitly marked: ink-soft `#6B5B49` supersedes v1 `#6F5C40`; glow `#E8B48C` lightens v1 `#C8893B`; radii grow (buttons→pill, cards 12→14px, sheet 18→22px); side margin 16→20px. |
| Uplift is EXPERIENCE, not look | YES | EXPERIENCE.md Foundation: "The uplift over v1 is **experience, not look** — capture friction was the pain; the flows below are the answer." Effort visibly concentrated in Component Patterns / Interaction Primitives / Key Flows. |
| Login-zoom gripe → "no unexpected scale/viewport jumps, ever" | YES | DESIGN.md Brand & Style anti-pattern + Typography ("Inputs never render below 17pt … the v1 login-zoom gripe made permanent as a floor") + Do's/Don'ts row; EXPERIENCE.md Interaction Primitives "No frame jolts, ever". |
| (side note) candidate one-line v1 web fix, input ≥16px | Consciously absent | Deferred-work note, not spine material. The *principle* landed as the ≥17pt floor. |
| Voice anchor: LINE (TW) | YES | EXPERIENCE.md Voice and Tone ("LINE (TW) is Simon's named anchor", "The test: would LINE ship it?"); DESIGN.md Don'ts row "Write zh-TW that LINE would ship". |
| Imports: none | Consistent | `imports/` exists empty; no import content claimed by spines. |
| Gripes sweep still open (Simon never declared the list complete) | Absent from spines | An open run item, not a spine defect — but nothing in either spine or the log's triage closes it. Flag for the finalize checklist. |

### 2026-07-08 — Voice guide locked (four arbitrations + master calibration)

| Decision | Landed? | Where |
|---|---|---|
| Capture verb = 記錄 (記下 superseded; 封存 rejected) | YES | EXPERIENCE.md vocabulary list; used throughout (記錄下個地點, 不加照片，直接記錄, 你記錄了 N 個地點). Zero stray 記下 in either spine. |
| Visit = 第 N 次 pure counter | YES | EXPERIENCE.md vocabulary ("pin/re-live surfaces, NOT recap rows"); date step sub, save moment line, re-live context line. |
| Save success = 已儲存 everywhere (已封存 rejected) | YES | EXPERIENCE.md vocabulary + save-moment row + Saving state; DESIGN.md toast component (已儲存). No 已封存 as copy anywhere in spines. |
| Recap = 你記錄了… factual-warm (都收好了 rejected) | YES | EXPERIENCE.md Session recap row (「你記錄了 N 個地點」) + UJ-1 step 7. 都收好了 absent from spines. |
| Master calibration: poetry in positioning only; save ANIMATION carries ritual, copy stays light | YES — named rule | DESIGN.md Brand & Style "The poetry-in-positioning-only rule (Simon's master calibration)" + Don'ts rows; EXPERIENCE.md Voice and Tone "Master calibration" + Interaction Primitives "The animation is the ritual — it carries the emotion the copy deliberately doesn't." |
| Guide = standing copy contract, Simon blesses before implementation | YES | EXPERIENCE.md "Process contract (PRD FR28)" — drafted against guide, reviewed before implementation, candidates marked. |

### 2026-07-08 — Prototype round 1 (Simon's corrections — all eight)

| Correction | Landed? | Where |
|---|---|---|
| Recap rows drop 第 N 次 (clutter) | YES | EXPERIENCE.md Session recap row: "**no 第 N 次 in recap rows** (Simon: clutter)". |
| Search-pill icon larger | YES | DESIGN.md `search-pill` token: icon terracotta **22px** (the corrected size captured as the spec). |
| 反查地址 jargon removed | YES | EXPERIENCE.md fine-tune row ("reverse-geocoded address as plain text — never the word for the mechanism") + pattern rules; DESIGN.md Don'ts ("jargon like 反查地址"). |
| Fine-tune confirm → 選擇地點 | YES | EXPERIENCE.md fine-tune row + vocabulary; DESIGN.md button-primary examples. |
| Date heading → 「哪一天去的呢？」 | YES | EXPERIENCE.md date step + vocabulary + UJ-1. |
| 先不填 chip removed → one skip per screen | YES | EXPERIENCE.md Interaction Primitives + voice pattern rules; DESIGN.md button-quiet ("The single skip/dismiss per screen") + Don'ts row naming the exact anti-example (先不填 chip *and* 略過 button). |
| 上傳 verbs (下一步：上傳照片 / 上傳（N 張照片）) | YES | EXPERIENCE.md date step primary + photo step primary — exact strings. |
| 建議而已 caption → ＋其他照片 picker tile | YES | DESIGN.md photo-tile `add-tile` spec ("a control, not a caption"); EXPERIENCE.md photo step; voice rule "no reassurance copy where a control belongs". |
| Loop button → 記錄下個地方 (later swept to 地點) | YES | EXPERIENCE.md capture loop: 記錄下個地點 (with round-2 noun sweep applied). |

### 2026-07-08 — Round 2

| Decision | Landed? | Where |
|---|---|---|
| Date chips = true shortcuts only: 今天 + previous place's date in session; wheel IS the other-date path (選其他日期 removed) | YES | EXPERIENCE.md date step — verbatim, including the session-as-suggestion-source rationale and "(no 選其他日期 chip)"; reinforced in capture loop ("the session carries the previous date as a chip") and UJ-1 step 3/6. |
| 去過的地點 geographic hierarchy (FR20) + in-collection search (FR21) + first-class tab (FR19) | YES | EXPERIENCE.md IA table + Geographic browse row (continent labels → country rows with flag/counts → region rows with place-name previews → dive to map; search pinned on top) + UJ-3. |
| 設定 built (FR26/FR30): profile card, 通知/地圖/資料 groups, red 刪除帳號, quiet 登出 | YES | EXPERIENCE.md Settings row + Notification controls row (ONE coherent surface, FR17); DESIGN.md grouped-card/avatar/toggle/destructive tokens. |
| Tab bar wired across all three surfaces | YES | EXPERIENCE.md IA (three-tab bar); DESIGN.md tab-bar component (地圖 / 去過的地點 / 設定). |
| 地方 → 地點 app-wide; two 記下 stragglers swept | YES | EXPERIENCE.md vocabulary ("the place noun **地點** app-wide … v2 deliberately diverges from v1"); every surface string uses 地點. Spines contain no working 地方 and no 記下. **But see finding F3: the voice guide's own §3 usage examples were not fully swept.** |

### 2026-07-08 — Round 3 (soul screens + first-run)

| Decision | Landed? | Where |
|---|---|---|
| Lock-screen rich notification (photo thumbnail = tap-earner, FR14) | YES | EXPERIENCE.md IA row + UJ-2 step 1 ("the memory's photo thumbnail — the photo earns the tap"); text-only fallback in State Patterns (NFR2). |
| Re-live landing (FR15/FR16): fly-to, glow pulse (RM→static), that-date visit sheet, cohort chip, ⋯ overflow mute | YES | EXPERIENCE.md Re-live sheet row + Interaction Primitives (glow timings, RM fallback) + UJ-2; DESIGN.md glow color rules + pin-marker hero/glow. |
| Intro brand moment — the ONE poetry surface (「你的私人旅行時光膠囊」) | YES | EXPERIENCE.md IA + UJ-4 step 1 ("the one poetry-allowed surface"); DESIGN.md Brand & Style names it as the sole in-app positioning surface. |
| Sign-in (FR23): Apple first / Google / Email, reassurance line, returning-web-user steering; sign-in → straight into search (guided first memory IS the capture flow) | YES | EXPERIENCE.md Sign-in row + UJ-4 — both approved strings verbatim; "no separate onboarding capture UI". |
| Notification pre-prompt (FR24): mini preview with user's own place, approved headline + sub, 開啟通知 / 先不用 | YES | EXPERIENCE.md Notification pre-prompt row + UJ-4 step 4 + decline path (never nags again; toggle waits in 設定). |

### 2026-07-08 — Approval + Claude Design sync

Process events (14 frames approved, :target JS fix, 16 @dsCard cards pushed). Correctly reflected as *references*: both spines cite the prototype as composition/behavioral reference "Simon-approved 2026-07-08" and DESIGN.md cites the "Mapsake v2" Claude Design project cards, with "spines win on conflict" stated in both. **But the cited path is `mockups/…`, which does not exist yet — finding F2.**

### 2026-07-08 — Open-items triage (during finalize)

| Item | Landed? | Where / gap |
|---|---|---|
| **Backfill granularity RESOLVED: approximate pin** — region/country search offers 「記錄這個地區」 → one center pin styled APPROXIMATE (hollow/dashed variant), region colored, upgradeable by drag | **NO — not in either spine** | The log itself said "to be folded in post-distillation since the distiller launched before this decision" — the fold-in never happened. DESIGN.md `pin-marker` has only standard + hero fills (no approximate variant); EXPERIENCE.md Search/Fine-tune/Capture-loop rows have no 記錄這個地區 path. EXPERIENCE's backfill story covers only place-level name-only memories. **Finding F1 (high).** |
| Session-recap trigger RESOLVED: explicit 完成這次記錄, no inferred end | YES | EXPERIENCE.md IA ("Session recap — Explicit 完成這次記錄 in the loop") + Session recap row ("Explicit end (FR12)") + capture loop + UJ-1. |
| Graduated curation carried forward: v2 ships place-mute in the ⋯ overflow; graduated options deferred to architecture/epics | YES (v2 part) / consciously absent (deferral note) | Mute-in-overflow landed (Re-live sheet row + Muted place state + Notification controls). The deferral itself is routed to architecture/epics per the log, so its absence from the spines is conscious — acceptable, worth one line during architecture handoff. |

### 2026-07-02 — Inherited PRD constraints (spot-checked)

All present: read-only map — "**Tap always reads, never writes** (FR3)", long-press as the only map write, "Region marking as a user action does not exist on iOS"; search-first capture with draggable fine-tune + plain-text address; multi-visit pins (FR6/FR9); date-suggested photos with contextual permission + full/limited/denied states; save moment with timings, haptic, Reduce-Motion fallback, save-after-ack (NFR4); loop + recap; signed-in-first first-run arc; photo-rich notification → that-date landing + cohort chip; geographic browse; designed settings/account/export; one notification-control surface; accessibility floor as a full EXPERIENCE section with the recomputed AA table in DESIGN (including the honestly flagged failing selected-chip pair, 4.09:1, marked "do not ship as-is"); anti-pattern posture (no feeds/streaks/completion/scarcity) in both spines' banned lists. FR28 voice-first is embedded as the process contract. Dark mode: correctly recorded as no-v2-decision (light-only, v1 Lamplight preserved).

---

## 2. Qualitative soul items — survival check

| Soul item | Survives? | Evidence |
|---|---|---|
| **Two speeds** (the full capture ritual vs. the light/backfill run; plain-quick capture vs. savored re-live) | YES | EXPERIENCE.md capture loop: "Run light — skip date, skip photos — **this same loop IS backfill**: rapid name-only memories, each still coloring its region"; UJ-1 "Repeat, seconds per place" vs. the five-step ritual; skipping first-class ("required fields don't exist on a memory"). The slower emotional tempo lives in UJ-2 and the save-moment/re-live choreography. |
| **Lock-in feeling via animation, not words** | YES — stated three times | DESIGN.md Brand & Style ("**The save animation carries the ritual emotion; the chrome and the copy stay plain**") + Don'ts row; EXPERIENCE.md save-moment row (full settle/ripple/haptic spec) + Interaction Primitives ("The animation is the ritual — it carries the emotion the copy deliberately doesn't"). Reduce-Motion fallback specified, so the ritual degrades deliberately rather than accidentally. |
| **Poetry in positioning only** | YES — a named, enforced rule | DESIGN.md "The poetry-in-positioning-only rule (Simon's master calibration, 2026-07-08)"; the intro's 「你的私人旅行時光膠囊」 identified as the single in-app allowance; Don'ts row bans 時光膠囊/封存-register on working surfaces; EXPERIENCE.md Voice and Tone mirrors it. |

---

## 3. Findings

**F1 (high) — The approximate-pin backfill decision never landed.** Simon-RESOLVED in the finalize triage: region/country search offers 「記錄這個地區」 → one pin at the region's center in an APPROXIMATE style (hollow/dashed marker variant), colors the region, upgradeable by dragging later. Neither spine contains it: DESIGN.md's `pin-marker` needs the approximate variant; EXPERIENCE.md needs the search/capture path (Component Patterns: Search + Fine-tune or Capture loop) and ideally a State Patterns note on how approximate pins interact with re-live. The log predicted this ("to be folded in post-distillation") — it is the one outstanding fold-in before `status: final`.

**F2 (medium) — Dangling `mockups/` references.** Both spines cite `mockups/capture-flow-prototype.html` (DESIGN also in frontmatter sources; EXPERIENCE also cites `mockups/voice-guide.md`), but no `mockups/` directory exists — the artifacts live in `.working/`. This matches the log's remaining step "promote keepers to mockups/", so it's a known pending action, but as of now every behavioral/composition/voice reference in both spines points at nothing. Must be resolved (promote, or repoint) before finalize.

**F3 (medium) — The locked voice guide contradicts its own arbitrations.** EXPERIENCE.md declares the guide "the microcopy contract … the guide governs," but the guide was never fully swept after the arbitrations: §4 still shows **rejected** copy as pattern examples — 「封存這段回憶」 (invitations), 「已封存」 (confirmations), 「這趟旅程，都收好了」(candidate) — and §3's 記錄 row usage examples still use the superseded noun 地方 (「記錄下個地方」「你記錄了 5 個地方」). The spines themselves carry the correct words everywhere; the hazard is future copy drafted "against the guide" resurrecting rejected register. Fix the guide (or note §3's table as overriding §4 examples) before promotion to `mockups/voice-guide.md`.

**F4 (low) — "See the run's open items" points nowhere.** DESIGN.md (selected-chip contrast failure, Latin display face) and EXPERIENCE.md (edit/remove surfaces, sheet detent set) refer readers to open items, but no open-items artifact exists in the run dir — they live implicitly in the decision log's triage section. Either add an Open Items block to a spine or name the decision log explicitly.

**F5 (low) — Gripes sweep never closed.** The 2026-07-08 brain dump left Simon's v1 design-gripes list open ("Simon hasn't declared the list complete"); only the login-zoom gripe was captured and elevated. Nothing since closes the sweep. Add to the finalize checklist: ask Simon to declare the gripes list done.

---

## 4. Conscious absences (verified intentional — no action)

- v1 web one-line fix (input ≥16px): deferred-work note, not spine scope; principle landed as the 17pt floor.
- Graduated re-live curation beyond mute: deferred to architecture/epics per the triage; v2's mute home is in the spines.
- Google Maps / Apple Photos reference apps: calibration inputs, not decisions.
- Prototype process details (LAN serving, :target JS fix, ds-card build script): tooling, correctly kept out.
- Dark mode: explicitly recorded as undecided-for-v2 rather than silently dropped.
