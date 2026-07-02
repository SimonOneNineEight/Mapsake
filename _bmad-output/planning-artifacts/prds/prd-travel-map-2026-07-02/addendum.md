# Addendum — PRD: Mapsake v2

Depth that belongs downstream (architecture, UX, epic planning) or is parked — not PRD requirements.

## Stack decision (decided)

**Native Swift/SwiftUI — decided** (architecture ratifies component choices below, not the stack itself). Chosen by Simon after an explicit tradeoff review against React Native/Expo and a Capacitor wrap. Reasons that carried: the UI/UX uplift is a core v2 goal (SwiftUI's native material/transitions by default); iOS-first with Android unscheduled; the UI is being redesigned anyway, so React component carryover was moot; widget potential is first-class in native. Costs accepted with eyes open: Android later = a second build; Simon reviews code in a language he's learning (SwiftUI's React-like declarative model softens this); DB row types hand-mirrored (no `supabase gen types` for Swift).

Component choices for architecture: `supabase-swift` (official SDK — auth, PostgREST, storage), `maplibre-native` iOS (PMTiles support confirmed — the v1 tile pipeline carries over unchanged), APNs via a Notification Service Extension for photo-rich push (`mutable-content: 1`, HTTPS JPEG ≤ 1MB, ≥ 300px; ~30s extension budget with text-only fallback).

**Rejected alternatives:** React Native/Expo (strongest counter-case: one codebase for a near-term Android — but Android is unscheduled and UX-feel is the point). Capacitor wrap (10% effort for native push, but keeps the webview feel v2 exists to escape).

## Multi-visit data model — web-compat concern (architecture phase, ⛔)

FR6 restructures the core unit: pin (place) → visits[] (date + note + photos each; notes are per-visit, decided at PRD finalization). The Supabase project is SHARED with the live web client, so the migration needs a compatibility strategy covering **both directions**: candidates include (a) additive schema (new `visits` table; `pins.memory_date` kept **writable** for the web client and trigger-bridged to/from the primary visit — a pure computed column would break web WRITES), (b) versioned API surface, (c) a web client update in lockstep (contradicts the maintenance-only assumption). The eligibility engine + `exif_taken_at` denormalization (added 2026-06-28) must be re-derived per-visit, with FR13's contentless down-weighting. Cross-channel push: the per-user daily ledger (`last_notified_at`) already caps at one notification/day across the web-push + APNs fan-out — verify under the per-visit engine rather than assume. Sequencing note: this migration is the single riskiest backend change in v2 — schedule early, behind read+write compat verification against the production web client.

## Geocoding provider (architecture decision, FR4)

Search must resolve place names AND pasted street addresses to coordinates, zh-TW-first (TW/JP quality matters most). Candidates: **Apple `MKLocalSearch`/`CLGeocoder`** (free, native, no key, excellent TW/JP quality — but Apple's developer terms prefer results displayed on Apple's map, and Mapsake renders MapLibre; pragmatic-risk call), **Nominatim/Photon (OSM)** (ToS-clean with MapLibre, free/self-hostable, weaker exact-address coverage in TW), paid options (Mapbox/Geoapify) if quality demands. Google Places is out (its ToS requires display on a Google map). Decide in architecture with a quick TW-address quality spike. Whatever the provider, placement is confirmed through a **draggable fine-tune pin + reverse-geocoded preview** (FR5) — geocoder error must be correctable by hand before saving.

## Notification quality specifics (UX + architecture)

APNs rich push: image chosen = the surfaced visit's best photo (needs a "notification photo" pick heuristic — first photo? largest? UX phase). Signed URL TTL must exceed the APNs delivery retry window. Copy stays server-generated zh-TW (`push-copy.ts` carries over, extended for visit-count lines like 「你第 3 次來到…」). Timehop's 24h-ritual framing and Photos' per-memory feedback ("show this place less" → maps to v1 mute) inform the UX. Delivery-time preference exists in `profiles.notif_time` (store-only in v1) — v2 should honor it (hourly cron matching each user's hour; assume UTC+8 default, per deferred-work note).

## Design workflow (UX phase)

Design system + screen mockups built as iPhone-viewport preview cards (~390pt), synced to a "Mapsake v2" **Claude Design** project (claude.ai/design — verified accessible via DesignSync 2026-07-02). Simon reviews AND edits (WYSIWYG canvas, inline comments, chat); converged screens become the SwiftUI reference. A served tap-through HTML prototype on Simon's iPhone complements the canvas for flow-feel. Export-to-Figma available if Simon ever wants Figma ownership. v1's EXPERIENCE.md/DESIGN.md (parchment/terracotta identity, 時光膠囊 voice) are the inheritance; the visual language evolves, the soul doesn't.

## Parked: pricing research

Category norm: freemium, ~€25–30/yr sub or €45–70 lifetime; keepsake positioning favors **lifetime unlock** (Visited €69.99, Pin Traveler €44.99, Skratch/Stampie €9.99) over subscription anxiety. Polarsteps' physical Travel Books show a merch path (printed 時光膠囊 book?) that fits the brand better than a paywall. Post-launch decision; v2 ships free.

## Parked: post-v2 candidates surfaced during discovery

- JournalingSuggestions API as a private, on-device capture prompt ("you were at X — pin it?").
- Multiple widget sizes/layouts (Stampie ships six).
- One-tap memory reel (Photos memory-movie pattern) — delight/share-to-self.
- English locale + the web client's deferred backlog (unchanged).
- iPad layout pass (SwiftUI adaptive groundwork laid in v2).
