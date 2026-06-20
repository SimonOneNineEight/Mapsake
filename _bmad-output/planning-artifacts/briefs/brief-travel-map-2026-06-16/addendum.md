# Addendum — travel-map

Detail that belongs downstream (PRD, architecture) but not in the 1-2 page brief.

## Technical constraints (for architecture)

- **Web-first, mobile-ready.** v1 ships as a web app, but a native/mobile version is an explicit future intent. The tech stack must NOT trap the product on web only. Favor:
  - An **API-first backend** so a future mobile client can reuse it.
  - A frontend approach with a credible mobile path — responsive web / PWA at minimum, or a stack that extends toward native (e.g. a shared-component or React/React Native-friendly direction).
  - Avoid web-only-coupled choices that would force a rewrite for mobile.
- **Durable persistence is a first-class requirement.** The category's #1 complaint is data loss on logout/reinstall. Reliable cloud storage, cross-device sync, and user data export are core requirements, not nice-to-haves.

## Map / data notes

- One continuous zoomable map with shared data; world → country → sub-region. Not two separate maps; no mode toggle. Sub-region (states/provinces) granularity needed, which has real map-data sourcing implications (correct geo boundaries, geopolitics handling).
- Default "home view" is user-chosen at onboarding (world vs home country) and changeable in settings; user lands on it at login.

## Parked / fast-follow ideas (post-MVP, from brainstorm)

- Auto-stitch photos + notes into a short memory video/reel (Polarsteps "trip reels" precedent).
- "Want to go" / wishlist state (dream-board layer).
- Printable / wallpaper "trophy map" (note: print is the category's highest-margin model).
- Year-in-review recap.
- Fuzzy-time granularity (season/year, not just exact date).
- EXIF: quietly pre-fill the date field from a photo's metadata (never auto-place on the map).
- Photo clustering into trips by timestamp.
- Sharing / public map links — deliberately deprioritized; product is private by design. (Note: "make it public" trajectory = open the product to more users, NOT public/social sharing of maps.)
