# Discovery Notes — Mapsake v2 PRD

Raw brain-dump capture (Simon, voice-dictated) + confirmed interpretations. Feeds the PRD; not the PRD.

## Brain dump 1 (2026-07-02)

**The feeling (Q1) — two speeds:**
- Users should be able to **log a memory really fast** (quick capture) OR **linger reviewing the photos/memories they want** (unhurried re-living). ["lock" in dictation read as "log" — pending Simon's confirm]
- → Design principle candidate: *fast in, slow back* — capture is instant, re-living is savored.

**v1 design gripes (Q2, partial — Simon says more to come):**
1. **Settings + account surfaces have "no design at all, just functions one after another."** [interpreted as the 設定 sheet + account/sign-in sheet — pending confirm] → v2 treats them as designed screens, not stacked controls.
2. **Add-memory interaction is backwards.** The ＋ button bottom-right feels wrong/weird ["a little bit rear" in dictation]. First instinct: **tap a spot on the map → place a pin there directly**, not button-then-tap drop mode. → v2 leads with direct manipulation.
   - ⚠️ UX-phase design knot flagged: v1 overloads plain map tap = mark region visited. Need a clean tap-semantics model (tap vs long-press; pin vs region) — decide in UX phase, not PRD.
3. **One date per pin doesn't match real life.** Users revisit a place across years and want photos from different visits, each with its own date. → **Multi-visit pins** (pin → visits, each with date + photos): the first true beyond-parity candidate feature.
   - Weight: data-model change on the SHARED backend (web app must stay compatible); enriches the re-live loop (multiple anniversaries per place); touches the eligibility engine (anniversary per visit, not per pin).

**Reference apps (Q3):**
- **Google Maps** — for the MAP mechanics: zoom in/out handling and the pin interaction feel. Bar to meet: the map should manipulate like a first-class map app, not a widget with a map in it.
- **Apple Photos** — for the PHOTO GALLERY (browsing, viewing) and, pointedly, for its **Memories notifications**: "they really bring me back to the app to review those photos." That is the exact emotional mechanic Mapsake's re-live loop performs — Apple Photos Memories is the gold-standard reference for how the notification → re-live landing should feel (and validates the retention bet with Simon's own behavior).

**Quiet wishlist (Q4):**
1. **v1's mobile-web design is "not the best" — v2 redesigns it outright** as a pure iOS app (reaffirms the UX-uplift scope; the phone experience is the primary surface now, not a responsive afterthought).
2. **A short save-success animation** when the user locks in a memory — felt feedback that "you successfully locked something." [Simon has now said "lock the memory" twice — his mental model of capture may genuinely be *locking a keepsake in*, worth honoring in the design language, not just reading as "log". UX phase: design the capture-confirm moment (animation; haptics are the natural iOS pairing).]
3. **A genuinely good notification is a big plus** — he hasn't experienced one himself yet (the iPhone web-push subscribe issue). Ties directly to the Apple Photos Memories reference: those notifications are PHOTO-RICH. Native APNs supports rich push with images (Notification Service Extension) — a concrete native-only quality win candidate for v2's re-live notification.

**Q5 (extra inputs):** none offered yet — "that's it in my mind for now." Q1/Q2 remain open for additions (PRD carries a "late-arriving gripes" open question; sweep before UX).

## Confirmations appended at PRD finalize (2026-07-02) — source-of-record closure

- **Read-only map + long-press capture:** Simon PROPOSED the read-only map himself during PRD review ("entirely remove marking by map-click… the map is a read-only thing, all visited marks added through the memory flow") and confirmed option (a): long-press = "add a memory here." The earlier "decide tap semantics in UX phase" note is superseded by this direct decision. Region marking removed as an iOS user action; backfill = batch empty memories.
- **"Lock" language:** Simon consistently says "lock the memory" — confirmed as his capture mental model (seal it into the capsule), routed into the FR28 voice guide; the lock-vs-log dictation ambiguity is closed (both readings converge on the same design intent).
- **Photo permission:** Simon chose contextual library authorization with the user deciding full vs limited access (FR8/NFR3).
- **Email sign-in:** added as the third method (v1 parity; every web user has a path in).
- **Per-visit notes:** confirmed (matches UJ-2's "that date's visit — its notes").

## Journey capture (coaching path, journey-led)

**UJ-1 — Logging the trip (post-trip ritual) — DRAFT, confirmed in outline:**
- REVISION of assumption: Simon does NOT capture during trips. Capture = a post-trip session at home, reviewing photos, logging the whole trip in one sitting. "Fast" (two-speeds) means each place takes seconds so a 10-place trip isn't data entry.
- Flow: **search the place** (no map zoom-hunting — v1's deferred Story 3-2 search is hereby promoted to v2 CORE, the front door of capture) → map flies there → add the visit → pick the **visit date** → pick the **photos** for that visit.
- After each place: user CHOOSES — add the next location immediately, or return to the map to see the pins placed so far.
- **Session recap:** when the logging session ends, a recap ("feedback modal") shows everything just added — the payoff beat; pairs with the save-success animation (the trip settling into the map).
- Photo picking: **date-suggested, not forced** (CONFIRMED) — after the visit date is set, the picker leads with photos taken around that date (on-device library metadata, private); manual picking always available. UJ-1 COMPLETE.

**UJ-2 — The re-live moment — CONFIRMED:**
- Notification = "N 年前的今天" + a **photo from that day as the notification image** — the photo is what earns the tap (Apple Photos Memories mechanic, Simon's own behavior).
- Tap → map opens **the memory logged for that date** (with multi-visit pins: lands on THAT DATE's visit — its notes + photos, not the pin's whole history).
- In-app: read the note, swipe that visit's photos; optionally drift to a few more places.
- Ending: **"close the app with satisfaction"** — no streaks, no guilt, no feed. The satisfaction is the retention. UJ-2 COMPLETE.

**UJ-3 — The deliberate visit (unprompted browse) — CONFIRMED:**
- Entry: **map-first** wandering, or **search a visited place** to jump straight there (search serves both capture AND browse).
- v1 places list = right idea, wrong execution: messy (alphabetical-ish) order, and hidden behind the obscure top-left button ("hidden for the new user… we should fix that").
- v2 mandates: (a) browse-all-memories is **first-class, obvious navigation** — not behind a mystery button; (b) list organized **geographically: continent → country → region → place** (exact design → UX phase).
- Shape note: logging is trip-shaped, browsing is geography-shaped — NO trip entity requested; geography is the organizing spine. UJ-3 COMPLETE.
