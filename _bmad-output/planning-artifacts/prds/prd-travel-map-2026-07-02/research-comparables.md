# Comparables Research — Mapsake v2 (July 2026)

Web-research digest (background subagent, ~14 searches). Feeds the PRD; cite from here.

## 1. Landscape

| App | Positioning | Monetization | Standout UX |
|---|---|---|---|
| [Polarsteps](https://www.polarsteps.com/) | Auto-GPS travel journal, "plan/track/relive", 18–20M users, social-follow live trips | Free app; revenue from printed [Travel Books](https://support.polarsteps.com/hc/en-us/articles/24005113311634-What-is-a-Travel-Book) + booking affiliates; [Plus sub](https://www.polarsteps.com/plus) = 20% off books. Deliberately no feature paywall ([Startuprad](https://www.startuprad.io/post/polarsteps-growth-privacy-first-travel-app-at-18m-users-startuprad-io)) | Zero-effort capture (background GPS dots), one-tap "Trip Reels" video; no "on this day" resurfacing found |
| [been](https://stampie.app/blog/best-travel-tracker-apps) | Country % completion tracker | €6/wk or €22.99/yr sub | % gamification, home-screen widgets; no journaling |
| [Visited](https://stampie.app/blog/best-travel-tracker-apps) | Checklist tracker + curated bucket lists; "more private" | €2.99/mo, €29.99/yr, €69.99 lifetime | Tap-to-fill country map; list-driven, no photos/notes |
| [Pin Traveler](https://pintraveler.net/posts/best_travel_map_app_2026) | "Simplicity and beauty" pin map, 1M+ users, anti-clutter (no booking/nav) | €5.99/mo, €29.99/yr, €44.99 lifetime | Color-coded pins with visit dates + photos; Trips = collections of pins; stats like "most visited pin" |
| [Wanderlog](https://monkeyeatingmango.com/blog/wanderlog-pricing-2026/) | Collaborative trip *planner* (Google-Docs-like), #4 grossing US Travel | Free + Pro $39.99/yr (AI, offline) | Planning, not memory-keeping — different job |
| [Lambus](https://tripmemo.app/best-travel-journal-apps) | Group trips + expense splitting | Free/$5 mo | Not a memory competitor |
| [Journi](https://tripmemo.app/best-travel-journal-apps) | Auto photo-timeline → printed books | €9.99/mo–€53.99/yr | AI camera-roll grouping by time/place |
| Newer: [Stampie](https://stampie.app/blog/best-travel-tracker-apps), Skratch | Passport-stamp / scratch-map aesthetics | €9.99 lifetime (both) | Strong aesthetic identity + 6 widget layouts (Stampie); "intentional collecting" framing |

Category pricing norm: freemium with ~€25–30/yr sub or €45–70 lifetime; Polarsteps is the outlier (physical goods).

## 2. Re-surfacing mechanics worth emulating

- **Apple Photos Memories** — the gold standard: up to [3 auto-generated memories/day](https://discussions.apple.com/thread/251047552) built from on-device scene/face analysis; richness comes from *knowing context* (named people, home/work location → birthdays, trips). Notification = one evocative titled collage, not text. iOS 26 [puts Memories first in Collections](https://appleinsider.com/inside/ios-26/vs/photos-ios-26-vs-ios-18-small-changes-huge-impact) with Apple-Intelligence "type to create a memory movie" + music-synced playback. Users can down-weight people/places — per-memory feedback controls matter.
- **Day One** — configurable ["On This Day" notification](https://dayoneapp.com/guides/tips-and-tutorials/on-this-day-view/) (choose time + which journals) plus a dedicated [On This Day widget](https://dayoneapp.com/blog/day-one-widgets-iphone-ipad/) showing past-year photos; tap-through to the entry.
- **Timehop** — daily 8am digest that [expires in 24h](https://help.timehop.com/article/751-how-to-manage-timehop-notifications) (scarcity drives daily open), with afternoon "you haven't looked yet" nudge. Still 20M+ users; "Then & Now" pairing (old photo vs today) is its signature.
- **Apple Journal** — ["Smart" reminders](https://support.apple.com/guide/iphone/build-a-journaling-habit-iph70107aec2/ios) timed to routine/location, streak widgets, and system-level [Journaling Suggestions](https://developer.apple.com/newsroom/2023/12/apple-launches-journal-app-a-new-app-for-reflecting-on-everyday-moments/) API (surfaces visits/photos as entry prompts — Mapsake can consume this API to suggest pins).

## 3. Steal-this iOS patterns for v2

1. **Notification Service Extension for photo-rich pushes**: `mutable-content:1`, HTTPS JPEG ≤1MB, ≥300px, 2:1 or 3:2 crop; ~30s budget with best-attempt fallback ([Batch docs](https://doc.batch.com/guides-and-best-practices/message/push-notifications/how-to-attach-an-image-an-audio-a-gif-or-a-video-to-a-push-notification), [SwiftLee](https://www.avanderlee.com/swift/rich-notifications/)). The "一年前的今天" push must carry the photo — the single biggest upgrade over web push.
2. **On This Day home/lock-screen widget** (Day One pattern): past memory photo + "N 年前" caption, deep-links to the pin. Ship multiple sizes/layouts like Stampie's six.
3. **JournalingSuggestions API** as a capture prompt source (place visits from on-device intelligence, fully private — on-brand).
4. **Google Maps gestures**: double-tap-drag one-handed zoom, two-finger-tap zoom-out ([SDK conventions](https://developers.google.com/maps/documentation/ios-sdk/controls)); long-press to drop a pin = the universal "tap map to add place" idiom. Pair with a draggable fine-tune pin + reverse geocode preview.
5. **Timehop's 24h daily ritual framing** — make today's memory feel like today's page of a keepsake, not a feed.
6. **Photos-style feedback controls** ("show this place less") to keep resurfacing feeling curated, not algorithmic spam.
7. **One-tap "memory reel"** (Polarsteps Trip Reels / Photos memory movies with music) as a delight/share-to-yourself feature — later epic.
8. **Lifetime unlock pricing** (€30–45 one-time) fits keepsake positioning better than subscription anxiety; Visited/Pin Traveler/Skratch all offer it.

## 4. Multi-visit modeling — a genuine gap

No comparable cleanly models "one place, many visits." Pin Traveler comes closest (visit dates per pin, "most visited pin" stat) but organizes by trips/color, not visit history per place. [Day One's map](https://dayoneapp.com/features/map-view/) scatters multiple same-place entries around the address — a known pain point ([forums](https://forums.dayoneapp.com/forums/topic/location-history/)). Polarsteps is trip-linear. Mapsake's place→visits[] model (one pin, stacked dated visits) is defensible and directly feeds richer "on this day" content ("你第 3 次來到…").

## 5. Positioning gap Mapsake can own

Every player is either social/share-first (Polarsteps, Pin Traveler badges), gamified completion (been, Visited, Skratch), or planning (Wanderlog). Nobody combines **private-by-default + daily memory resurfacing + place-centric multi-visit history**, and none is zh-TW-first (足跡/旅行紀錄 keywords are underserved in Taiwan's App Store; category ASO guidance: exact-intent long-tail in title/subtitle, [AppTweak](https://www.apptweak.com/en/aso-blog/app-store-keyword-research-aso)). Suggested frame: **"私人的旅行記憶盒"** — Photos-Memories-quality resurfacing applied to *your places*, no followers, no percentages. Live Activities: no memory app uses them; only justified use here would be an "on a trip" capture session — skip for v2.
