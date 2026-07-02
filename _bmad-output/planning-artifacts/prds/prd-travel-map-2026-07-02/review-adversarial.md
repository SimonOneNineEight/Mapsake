# Adversarial Review — PRD: Mapsake v2 (native iOS)

- **Artifacts reviewed:** `prd.md`, `addendum.md` (prd-travel-map-2026-07-02)
- **Stance:** skeptical senior PM + iOS architect; goal is to find what hurts downstream
- **Date:** 2026-07-02
- **Verdict:** **CONDITIONAL FAIL — not architecture-ready.** The PRD is unusually honest for a draft (assumptions tagged, blockers marked ⛔), but it contains one critical self-contradiction (FR8 vs NFR3/§7 — the flagship capture feature is unimplementable under the flagship privacy stance), one half-scoped migration (multi-visit write path), and one broken promise to existing users (FR25 "same account" vs Sign in with Apple private relay with merge cut from scope). Fix those three before architecture starts; the rest is cleanup.

---

## 1. Contradictions between requirements

### C1 — CRITICAL: FR8 date-led photo suggestions contradict NFR3 and §7 (full detail in §4, T1)
Listed here because it is first a *requirements contradiction*, not just a compliance trap: FR8 + UJ-1 step 3 promise a picker that "leads with photos taken around that date," while NFR3 promises "no full-library permission for capture" and §7 declares the privacy label "photos (user-selected only)." These three statements cannot all be true on iOS. See §4 for the API-level proof and the three honest resolutions.

### C2 — MEDIUM: "The map is read-only. Tapping always reads" (FR3) vs pin placement in FR4/UJ-1
FR3's absolute language — "Tapping always *reads* ... and never writes; the sole write gesture is the deliberate long-press of FR5" — is contradicted by the capture flow itself:

- FR4: after search, "the map flies to the exact spot and **the user places the pin there**."
- UJ-1 step 2: "He **places/confirms the pin**."

Placing/confirming a pin after search is a write interaction on the map that is neither a read nor the FR5 long-press. The obvious resolution is that FR3's rule applies only in *browse mode* and capture mode has its own tap semantics — but the PRD never says so. As written, a literal-minded UX designer or engineer inherits a rule ("tapping never writes") that the primary journey violates in step 2. One sentence fixes this: scope FR3 to the default/browse map state and name capture mode as an explicit exception.

Verdict on the read-only-vs-FR5 pairing itself: internally consistent (FR3 explicitly carves out FR5), though calling a map with a write gesture "read-only" is a misnomer that will be quoted out of context downstream. The real gap is FR4, not FR5.

### C3 — HIGH: Multi-visit (FR6) vs per-place notes (FR9) — the journeys already assume per-visit notes
FR9's `[ASSUMPTION]` keeps notes per-place. But three other places in the document quietly assume per-visit notes:

- UJ-2: tapping the notification opens "**that date's visit: its note**, its photos." Under FR9 there is no such thing as "that visit's note" — there is one place-level note blob shared by every visit. The 「你第 3 次來到京都」 notification will open visit #3 displaying a note written about visit #1.
- FR13: "Contentless backfill memories (no date, no photos, **no note**)" — contentless-ness is evaluated per-memory/per-visit, but the note attribute exists per-place. If a place has one note and three visits, are all three visits "with note"? The exclusion rule references an attribute that doesn't exist at the level it's evaluated at.
- FR15: "the memory opens to the right visit" — with what note content?

This is not a "revisit in UX phase" nicety as FR9 frames it; the re-live deep-link (the soul, UJ-2) renders wrong under per-place notes the moment any place has two visits. Either commit to per-visit notes now (with the web-compat consequence — see §5, P2) or rewrite UJ-2/FR13 to be honest about place-level notes.

Related: the PRD uses **memory / visit / pin / place** interchangeably without a glossary. FR6 defines pin=place holding visits; FR11 then creates "empty **memories**"; FR13 weights "**memories**"; NFR4 protects "**memories**." Is a memory a visit or a pin? Every downstream artifact (schema, engine rules, copy) needs this nailed. One definitions block fixes it.

### C4 — HIGH: Signed-in-first (FR23) + "same account" (FR25) vs the §1 funnel and the merge scope-cut
§1 positions the web app as "the **anonymous, try-before-you-install front door**" and the native app as "the retention surface." §6 then cuts cross-account merge as "**mooted on iOS by signed-in-first**." This is backwards: signed-in-first doesn't moot merge, it makes merge the load-bearing bridge of the advertised funnel. The anonymous web user who tries the front door, logs pins, and installs the iOS app hits a sign-in wall behind which their data does not exist — and the only mechanism that could carry it over (merge, v1's 2-8) is explicitly out of scope. The PRD's own funnel strategy and its own scope-cut contradict each other. Either (a) accept and *state* that the anonymous-web funnel is marketing-only and anonymous data is abandoned at install, or (b) pull merge (or a one-shot "claim your anonymous map" import) back into scope. Don't leave "mooted" in the document — it will be cited to kill the funnel work later.

### C5 — MEDIUM: FR3 legacy web region-marks are readable but not removable on iOS
"iOS reads but never writes" legacy web marks means an existing user with an accidental v1 region-mark (the exact accident class FR3 exists to eliminate) sees the wrong fill on iOS forever, with no affordance to fix it — unless they go back to the web app they were told to abandon. Parity consequence, filed under §5 (P1), but note it's also a self-contradiction: FR3's rationale is "resolves accidental marking outright," yet it permanently enshrines v1's accidental marks.

---

## 2. Requirements that are secretly implementation

The addendum is the right pattern (stack parked for architecture to ratify) — but the FR list still bakes in implementation, which pre-empts the very architecture phase the addendum defers to:

| Ref | Leakage | Severity |
|---|---|---|
| FR1 | "using the v1 tile pipeline (PMTiles)" | Low — legitimate brownfield constraint, but label it a *constraint*, not part of the requirement |
| FR8 | "Photos upload to the existing `pin-photos` storage" — a bucket name inside an FR | Low |
| FR13 | Names the 4-tier engine internals (EXIF/created/rediscovery) and mandates "server-side" | Low-Med — "server-side" forecloses on-device evaluation options without argument |
| FR14 | "Notification Service Extension" named in the FR (the *requirement* is photo-rich push; NSE is the how) | Low |
| FR25 | "same Supabase accounts" | Low — genuine constraint; label as such |
| FR2 | "geography, not proximity" clustering with per-region aggregate count pins is a *solution*, not a requirement — and it smuggles in an unscoped data dependency: **every pin (including every legacy web pin placed by raw tap) needs a region/country assignment** for the counts to exist. Nothing in the PRD, addendum, or open questions scopes pin→region derivation (point-in-polygon vs stored region id, admin-boundary data at two hierarchy levels). This is a hidden backend work item disguised as a visual note ("visual design → UX phase"). | **Medium** |

Recommendation: add a "Constraints (brownfield)" subsection and move the Supabase/PMTiles/pin-photos facts there; restate FR2 as the outcome ("at low zoom the map communicates where memories are and how many, per region") and move the aggregate-pin mechanic + the pin→region derivation into the addendum/architecture with the other ⛔ items.

---

## 3. Multi-visit + shared backend: honestly scoped or hand-waved?

**Half and half — the read path is honest, the write path is hand-waved.**

Honest: FR6 points to the addendum; the open question carries a ⛔; the addendum names three candidate strategies, calls it "the single riskiest backend change in v2," and sequences it early behind reads-compat verification against production web. That is more honesty than most PRDs manage.

Hand-waved — four gaps, none acknowledged anywhere:

1. **HIGH — Web writes.** The addendum's preferred candidate (a) says "web reads unchanged." The web client is not read-only. Web users create pins and edit `pins.memory_date` today (maintenance-only ≠ frozen usage). Once a pin has `visits[]`: what does a web *write* to `memory_date` mean? Which visit does it update — earliest, latest, a synthetic "web visit"? Does a web-created pin get a visit row auto-created (and by what trigger)? If `memory_date` becomes "a computed/denormalized view," it is no longer writable at all and web *edit* breaks — an NFR6 violation hiding inside the recommended strategy. The compatibility strategy must be read+write, and the PRD should say so.
2. **HIGH — Dual-channel push duplication.** Every migrating web user (the entire FR25 population, including Simon — SC2) may hold both a live web-push subscription and a new APNs token against the same account. The shared cron sender + 1/day ceiling are never scoped for channel selection or dedup. Default outcome: the same anniversary fires twice, on the product surface whose counter-metric is "must never feel spammy" (SC counter-metric < 20% mute). Not mentioned in PRD or addendum. Must be an explicit requirement (e.g., "APNs token registered ⇒ suppress web push for that user").
3. **MEDIUM — Engine per-visit semantics get one sentence.** "Extended to multi-visit pins: each visit's date is an anniversary candidate" plus "exif_taken_at ... re-derived per-visit" is the entire spec for reworking the product's soul. Unanswered: does mute stay per-place (FR17 says so) while anniversaries are per-visit — deliberate? How does the "N more from this day" cohort (FR16) interact with multiple visits to the same place on the same date-of-year? Do tier-2/3 fallbacks (EXIF/created) apply per-visit or per-pin? These are architecture questions, fine — but the ⛔ open question only names "data model + web compatibility," not engine semantics. Widen the ⛔.
4. **MEDIUM — Region-level "empty memory" placement vs the web renderer.** Open question in §6 floats pins "bound to a region rather than exact coords." The live web client renders pins from coordinates. A coordinate-less pin either breaks web rendering or renders at a centroid (the exact false precision the question wants to avoid) — a latent NFR6 conflict the addendum's compat section doesn't list. Cross-link it into the ⛔ item.

---

## 4. App Store compliance traps

### T1 — CRITICAL: FR8's date-led suggestions require the full photo-library permission that NFR3 and §7 promise to avoid
The claim under test: NFR3 — "photo-library access uses the minimal iOS picker surface (**no full-library permission** for capture); date-based suggestions compute on-device"; §7 — privacy label "photos (**user-selected only**)". The feature under test: FR8/UJ-1 — the picker "**leads with photos taken around that date** from the user's library."

API-level facts:

- The permissionless picker (`PHPickerViewController`, out-of-process) is exactly why no permission is needed: **the app cannot see, query, filter-by-date, sort, or scroll-position its contents**. `PHPickerConfiguration` filters by asset *type* only. There is no "open at date D" or "surface photos near D first" capability, through iOS 18.
- To find "photos taken around 2024-04-12," the app must run `PHAsset.fetchAssets` with a `creationDate` predicate — which requires `PHPhotoLibrary` authorization at the **full** `.authorized` level. `.limited` ("Select Photos") only exposes photos the user already hand-picked, which is circular for a suggestion feature.
- `JournalingSuggestions` (iOS 17.2+) is the only permissionless suggestion surface, but it is entitlement-gated (Apple approval required) and surfaces *recent* moments only — it cannot answer "photos around an arbitrary historical date," which is the entire FR8 use case (post-trip and years-later backfill). The addendum itself parks it post-v2, confirming it is not the FR8 mechanism.

Therefore FR8 as written is **unimplementable** under NFR3/§7. Three honest resolutions — the PRD must pick one now, because it decides UX, privacy copy, and App Review posture:

- **(a) Take full-library read permission** for the suggestion feature (with a contextual pre-prompt and graceful degradation to the plain picker on denial). Update NFR3 and §7 accordingly. Note: if metadata truly never leaves the device, the *nutrition label* may survive (labels declare data collected/transmitted, not on-device reads) — but the §7 sentence "photos (user-selected only)" describes an access model that is no longer true, `NSPhotoLibraryUsageDescription` full-access prompt appears in the flagship "private" product, and App Review 5.1.1 data-minimization questions follow ("why full library when a picker exists?"). Have the answer written down.
- **(b) Degrade FR8** to the plain permissionless picker (no date-lead). Privacy posture intact, but UJ-1's "seconds per place, a pleasure not data entry" and SC1 take a direct hit — date-led suggestion is the single biggest speed lever in the capture ritual.
- **(c) Hybrid:** default (b); offer (a) as an opt-in "smart suggestions" upgrade inside capture. Most work, most honest.

Whichever is chosen: UJ-1 step 3's "(on-device library metadata, private)" parenthetical must stop implying permissionless — "on-device" and "no permission" are different claims and the PRD currently blurs them.

### T2 — MEDIUM: Account deletion is asserted (NFR7) but implemented nowhere
NFR7 correctly cites guideline 5.1.1(v), but no FR delivers it: FR26's settings inventory lists "account, notifications, default view, muted places, export, language" — export (FR27) yes, deletion no. Add an FR. Two sub-traps riding on it:

- **Shared-account blast radius:** deleting the account on iOS deletes the same Supabase account the web map lives on. The deletion flow needs explicit "this erases your web map too" messaging and a scoped backend cascade (pins, visits, `pin-photos` objects, push subscriptions, profile).
- **Sign in with Apple token revocation:** since 2022 Apple requires apps using SIWA to revoke the user's Apple tokens (`REST revoke` endpoint) as part of account deletion. Not mentioned; it's a review-time rejection class.

### T3 — HIGH: Sign in with Apple private relay silently forks FR25's "same account" promise (detail in §5, P3)
Compliance angle here; user-harm angle in §5. FR23 correctly makes Apple sign-in mandatory. But Apple sign-in defaults many users into **Hide My Email** relay addresses. Supabase treats identity by provider+email; a web user who registered with Google/email and taps the shinier "Sign in with Apple" button on iOS gets a **new empty account**, and the PRD has removed the only repair tool (merge, §6 cut). FR25's promise holds only if the user guesses the same provider. Requirement needed: either provider-linking on first iOS sign-in ("already have a map? sign in the way you did on the web"), Supabase identity linking, or first-run copy that steers migrating users to their original provider. Silent fork of a memory-keeping product = worst-case trust failure.

### T4 — MEDIUM: Privacy label completeness — EXIF GPS makes uploaded photos a *location* disclosure
§7's label plan says location is not collected ("v2 needs no location permission at all"). But photos uploaded to `pin-photos` carry EXIF, and the backend already parses it (`exif_taken_at` denormalization, 2026-06-28) — so EXIF **GPS** (precise location) is plausibly collected and linked to identity, permission prompt or not. Nutrition labels describe data collected, not permissions requested. Either strip GPS EXIF at upload (cleanest, on-brand) or declare Precise Location in the label. Also: pin coordinates and photos are user content collected and **linked to account** — the label needs "Photos or Videos: linked to you" and "User Content: linked to you" regardless; §7's "photos (user-selected only)" is a permission-model phrase, not a label category, and will confuse whoever fills in App Store Connect.

### T5 — LOW: Forced sign-in before use
FR23's signed-in-first wall is defensible under 5.1.1 (core functionality is account-based sync), and the warm intro precedes it. Keep the intro genuinely informative so Review sees value-before-wall. No change needed; noting it was checked.

---

## 5. What "parity" (FR25) quietly breaks for existing web users

FR25 reads as "sign in and your map is just there." For a v1 web user, iOS is not a superset — it's a different contract on the same data:

- **P1 — MEDIUM: Region marks become read-only relics.** Their web region-marks render on iOS (FR3) but cannot be edited or removed there. Wrong/accidental v1 marks are permanent on the new primary surface; the fix requires returning to the maintenance-mode web app. Needs either a one-time "review your regions" migration moment or a minimal unmark affordance (which would contradict FR3 — decide, don't drift).
- **P2 — HIGH: The note field changes meaning under their feet.** Whatever resolves C3: if notes go per-visit, the web client shows/edits a single place-note that no longer maps 1:1 to iOS data (which visit's note does web edit?); if notes stay per-place, iOS's own UJ-2 renders misleadingly (visit #3 opens with visit #1's note). Either branch is a live-product behavior change for web users that NFR6's "don't break the web client" framing (API-level) doesn't capture — parity is semantic, not just schematic.
- **P3 — HIGH: The account fork (T3).** The most likely first action of a loyal web user on iOS — tapping Sign in with Apple — creates a second, empty map with no merge path. This is the single most probable Day-1 support incident and it targets exactly the users the product owes the most.
- **P4 — HIGH: Duplicate notifications (§3 gap 2).** Migrating users with a live web-push subscription + new APNs token risk double delivery of the same anniversary from the shared cron sender. Directly attacks the counter-metric.
- **P5 — LOW-MED: Re-live behavior shifts for existing data.** FR13's new down-weighting/exclusion of contentless memories and per-visit anniversary candidates change what *web-only* users receive from the shared engine, even if they never install iOS. Probably an improvement — but it's an unannounced behavior change to a live product and should be listed as such in the ⛔ item.
- **P6 — LOW: Settings written from two surfaces.** FR17's "one coherent control surface" on iOS writes shared profile settings that v1's "two contradicting controls" on web also write. Until web is aligned (explicitly post-v2), a user can toggle on iOS and un-toggle on web without realizing. Worth one line in FR17 defining which storage fields are canonical.

---

## 6. Smaller findings

- **FR12 recap vs inferred session end:** "session end is inferred" makes the recap — named as "the session's payoff beat" in the primary journey — fire at an unpredictable moment. If a user backgrounds the app mid-session (iOS suspends aggressively), is that an end? A payoff beat with fuzzy timing is a payoff beat that misfires. The `[ASSUMPTION]` is tagged, good — but flag it as UX-phase *risk*, not just a decision.
- **NFR1 "60fps on iPhone 12-class":** iPhone 12 is a 60Hz device; on ProMotion hardware the same bar should read "matches display refresh," or the acceptance test is ambiguous.
- **SC4 sample size of one** ("a first-time user completes UJ-4 unaided") is a demo, not a criterion; say "N of M users" even if M=3.
- **FR24/UJ-4 first-run asks for note + photos in the guided first memory** ("a real memory with note + photos") while FR7/FR11 elsewhere celebrate optionality. If the guided flow *requires* photos, the friend without photos of "a place she loves" stalls at step 3 of onboarding. Mark them as encouraged, not required.
- **Widget stretch goal (FR18)** reads "IN scope ... ship without it only if it threatens the launch date," i.e., in-unless-out — fine, but note the widget reads photo data via an App Group; that's an architecture-phase data-sharing decision that should ride the same ⛔ list if FR18 survives epic planning.

---

## 7. Gate actions (ordered)

1. **Resolve C1/T1 (FR8 vs NFR3/§7) in the PRD, not the architecture phase** — pick (a) full-library with degradation, (b) degraded picker, or (c) hybrid, and rewrite FR8, NFR3, UJ-1 step 3, and §7 to agree. This decision changes privacy copy, App Review posture, and the capture ritual's core promise; nothing downstream can proceed coherently without it.
2. **Widen the multi-visit ⛔** to explicitly cover: web *write* semantics for `memory_date`, engine per-visit rules (mute/cohort/tier fallbacks), dual-channel push dedup (P4), and region-level placement vs web rendering.
3. **Fix the FR25 fork:** add an identity-linking / provider-steering requirement for migrating web users; delete the word "mooted" from the merge scope-cut and state the anonymous-funnel data outcome honestly (C4).
4. **Add the account-deletion FR** (in-app, SIWA token revocation, shared-account blast-radius messaging) so NFR7 has an implementation (T2).
5. **Decide C3 (per-visit vs per-place notes) before UX writes UJ-2 screens** — the deep-link rendering depends on it.
6. Cleanup: constraints subsection for the implementation leakage (§2), FR2 restated as outcome + pin→region derivation scoped, glossary for memory/visit/pin/place, EXIF-GPS stripping decision (T4).

Items 1–3 are the gate. The PRD's bones are good — the vision, the honest ASSUMPTION tags, and the addendum discipline are all better than typical. That's exactly why the three load-bearing contradictions above are dangerous: everything else is credible enough that they'll be believed too.
