# Source Reconciliation — UX spines vs PRD + Brief

Inputs were the upstream **PRD** and **Product Brief** (inherited by reference, not user-supplied visuals). The spines hold UX/design decisions; product scope lives upstream. This note records how the spines reconcile with those sources.

## Inherited by reference (not duplicated into spines)
- Personas, positioning, jobs-to-be-done, FR/NFR scope — remain in the PRD/Brief.
- Named journeys **UJ-1 / UJ-2 / UJ-3** — used verbatim as EXPERIENCE.md Key Flows.
- Hard product decisions (single continuous map, binary visited, add-details-later, optional date, map+memory-together) — carried into the spines as UX rules.

## Coverage confirmed (via review-coverage.md)
All FR/NFR with a UX surface now have a home in the spines, including the ones the first draft missed and were added during finalize: data export (FR4), account/auth placement (FR1/2), photo batch upload (UJ-3 / NFR4/6), sync/save + offline-shell states (FR3 / NFR1/3/5).

## Qualitative ideas intentionally PARKED (brief "fast-follow", not v1)
Surfaced here so they are not lost: city-pins within large admin-1 regions; auto-stitched memory reel/video; "want to go"/wishlist layer; printable/wallpaper "trophy map"; year-in-review recap; fuzzy-time granularity (season/year); photo clustering into trips. **EXIF date pre-fill was elevated** from fast-follow into v1 as part of the re-live eligibility model (implicit dating) — it is load-bearing for the loop.

## Deltas from upstream (decided during UX, flagged for downstream)
- **Language pivot:** PRD/config assumed English-first; UX pivoted to **zh-TW primary, English fast-follow**. Project config `product_languages` should be updated to match.
- **Dark mode:** specified (Lamplight) but **deferred to Phase 2**; v1 is light-only.
- **Re-live engine:** PRD left cadence open; resolved to curated max-1/day + a 4-tier eligibility model (explicit → EXIF → created-date → dateless rediscovery) so the loop fires for breadth-first users.

## Nothing material dropped
No in-scope PRD requirement was silently discarded. Items deferred to architecture (auth method, disputed-border dataset/labels, sync conflict resolution) are explicitly marked as such in the spines.
