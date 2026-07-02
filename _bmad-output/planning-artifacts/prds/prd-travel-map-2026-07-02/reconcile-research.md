# Reconciliation: research-comparables.md → prd.md + addendum.md

Gate check: did the PRD use what the research earned, are parked items preserved, and did any research insight fail to land anywhere?

**Verdict: PASS with refinement-level gaps.** The research is well-mined: the positioning gap is the PRD's spine, every accepted steal-this pattern traces to a requirement or the addendum, and all three deliberately parked items are preserved in the addendum. The findings below are lossy-compression cases, not lost insights — with one exception (per-memory feedback) that was flattened in a way the PRD's own counter-metric makes risky.

---

## 1. Positioning gap — USED, faithfully

Research §5 earned: nobody combines **private-by-default + daily memory resurfacing + place-centric multi-visit history**, none zh-TW-first; ASO long-tail (足跡/旅行紀錄) underserved in Taiwan.

- PRD §1 "Positioning" restates the triad almost verbatim and cites `research-comparables.md`. ✓
- zh-TW-first is elevated to a process requirement (FR28: 語感 voice guide, native-arbiter review) — stronger than the research asked for. ✓
- App Store presence (§7) targets the exact keywords the research surfaced (足跡地圖, 旅行紀錄, 回憶), tagged `[ASSUMPTION]`. ✓
- Multi-visit as differentiator: research §4 (the Day One same-place scatter pain, Pin Traveler near-miss) directly produced FR6 (place → visits[]) and FR13's 「你第 3 次來到…」 line — the research's own example phrase. ✓

**Intentional divergence, not a loss:** research suggested the frame 「私人的旅行記憶盒」; the PRD uses 「私人旅行時光膠囊」. This preserves v1's established 時光膠囊 identity (addendum "Design workflow" names it as the inheritance). Coherent choice; no action needed.

## 2. Accepted steal-this patterns — traced

| Research item | Where it landed | Status |
|---|---|---|
| §3.1 Photo-rich NSE push (mutable-content:1, ≤1MB JPEG, ≥300px, ~30s budget, fallback) | FR14 + NFR2 (requirement level); exact technical constraints preserved in addendum "Stack decision" and "Notification quality specifics" | ✓ Fully used, correct altitude split |
| §3.2 On-this-day widget (Day One pattern, photo + "N 年前", deep-link) | FR18 (stretch goal, decision deferred to epic planning, tracked in Open Questions) | ✓ Used; "multiple sizes like Stampie's six" correctly split to addendum post-v2 list |
| §3.4 Long-press = the universal add-place idiom | FR5 (the one deliberate write gesture); FR1 sets the Google-Maps-on-iOS fluidity bar generically | ✓ Mostly used — see gap G3 for the dropped second half |
| §3.5 Timehop ritual framing ("today's page of a keepsake, not a feed") | UJ-2 embodies it ("closes the app satisfied… the satisfaction is the retention"); addendum notification-quality section cites Timehop explicitly for UX | ✓ Framing used; mechanics undecided — see gap G2 |
| §3.6 / §2 Photos feedback controls | FR17 (mute per place carries over, controls unified into one surface); addendum maps "show this place less" → v1 mute | ⚠ Partially — flattened; see gap G1 |
| §2 Photos "notification = evocative image, not text" | FR14 "the photo is the tap-earner (Apple Photos Memories mechanic)" | ✓ |
| §2 Day One configurable notification time | FR17 delivery time; addendum commits v2 to honoring `profiles.notif_time` (store-only in v1) | ✓ |

## 3. Deliberately parked items — all present in addendum, none lost

- **JournalingSuggestions API** (research §2, §3.3) → addendum "Parked: post-v2 candidates", first bullet, with the on-brand privacy rationale intact. ✓
- **Memory reel** (research §3.7, "later epic") → addendum parked list ("One-tap memory reel (Photos memory-movie pattern)"). ✓
- **Pricing** (research §1 norms table, §3.8 lifetime unlock) → PRD §6 Out explicitly says "research parked in the addendum"; addendum "Parked: pricing research" preserves the numbers (Visited €69.99, Pin Traveler €44.99, Skratch/Stampie €9.99), the lifetime-vs-subscription reasoning, AND adds the Polarsteps physical-book merch angle from the landscape table. ✓ Exemplary — the parked section is richer than a pointer.

Bonus preservation: Stampie multi-widget layouts and the Polarsteps Trip Reels lineage both survive in the addendum with attribution.

## 4. Gaps — research insights that should have informed a requirement but don't fully appear

### G1 (medium) — Per-memory feedback controls were flattened to binary place-mute
Research §2 flags this twice: "Users can down-weight people/places — **per-memory feedback controls matter**" and §3.6 "feedback controls to keep resurfacing feeling curated, not algorithmic spam." The PRD only carries v1's **per-place hard mute** (FR17), and the addendum explicitly maps the Photos pattern down to it ("'show this place less' → maps to v1 mute").

Why this bites in v2 specifically: FR6's multi-visit model makes place-mute *coarser* than it was in v1 — one place now holds many dated visits, and a user who never wants one visit resurfaced (a soured memory at an otherwise loved place) has no lever short of silencing the whole pin. The PRD's own counter-metric (§5: mute/opt-out < 20%, "if people silence it, the soul is failing") depends on graduated curation levers existing. A hard mute is the bluntest possible one; the research earned "show this less" / per-visit suppression and it appears nowhere — not as an FR, not in Open Questions, not in the addendum's parked lists. **Recommendation:** add to §6 Open Questions (UX phase): "Per-visit / soft ('show less') resurfacing feedback beyond place-mute — FR13/FR17."

### G2 (low) — Notification cadence mechanics: no recorded decision
Research §2 established the norms: Photos up to 3/day; Timehop daily 8am digest **that expires in 24h** plus an afternoon "you haven't looked yet" nudge — scarcity as the daily-open driver. The PRD keeps v1's 1/day ceiling (FR13) and delivery-time preference (FR17/addendum), which is a defensible curated stance, but the expiry and second-touch-nudge mechanics are neither adopted nor explicitly rejected/parked anywhere. The "no streaks" soul plausibly rejects the nudge — but implicit rejection isn't recorded, so it's relitigatable. One line in §6 Out or the addendum ("Timehop expiry/nudge mechanics considered and rejected — pressure contradicts the capsule") would close it.

### G3 (low) — Draggable fine-tune pin + reverse-geocode preview dropped
Research §3.4 paired long-press with "a **draggable fine-tune pin + reverse geocode preview**." FR4/FR5 cover search-fly-to and long-press placement but say nothing about adjusting a slightly-off pin or previewing the resolved address before saving — the confirm-the-right-place affordance. Arguably UX-phase altitude, but the addendum's geocoding section (the natural home) doesn't carry it either, so it's currently nowhere. Cheap fix: one clause in the addendum geocoding section.

### G4 (low) — Live Activities "skip" verdict unrecorded
Research §5 closes with a scoped recommendation: "Live Activities… only justified use would be an 'on a trip' capture session — **skip for v2**." The PRD's Out list doesn't mention it. A decided-against item that isn't written down tends to get re-asked. One bullet in §6 Out.

## 5. Non-gaps checked and cleared

- **Polarsteps zero-effort GPS capture** — deliberately inverted (post-trip ritual, §7 "the map never tracks the user"). Consistent positioning choice, not an omission.
- **Timehop "Then & Now" pairing** — noted in research landscape but never promoted to the steal-this list; correctly absent.
- **Journi's AI camera-roll grouping** — FR8's on-device date-led photo picker is the privacy-preserving analogue. Covered.
- **Category pricing norm table** — fully preserved in addendum pricing section.
- **Google Places rejection / geocoding ToS nuance** — addendum geocoding section handles it, including the MapLibre display-terms risk the research's Apple-vs-OSM framing implied.

## 6. Summary

| Check | Result |
|---|---|
| Positioning gap used | Yes — PRD spine, cited |
| Accepted patterns (NSE push, Timehop framing, feedback/mute, widget) | 3 fully, 1 flattened (G1) |
| Parked items in addendum (JournalingSuggestions, reel, pricing) | All 3 present, none lost |
| Uncaptured insights | 4, all refinement-level (1 medium, 3 low) |

Gate verdict: **PASS** — proceed to finalize; fold G1 into Open Questions and add one-line dispositions for G2–G4 if a revision pass happens anyway.
