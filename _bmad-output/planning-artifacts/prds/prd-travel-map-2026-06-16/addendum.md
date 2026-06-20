# Addendum — travel-map PRD

Detail that belongs downstream (architecture, UX) but not in the PRD's main narrative.

## Technical constraints (for architecture)

- **Web-first, mobile-ready.** v1 ships as a web app, but a native/mobile version is an explicit future intent. The stack must not trap the product on web only. Favor:
  - An **API-first backend** so a future mobile client reuses it.
  - A frontend with a credible mobile path — responsive web / PWA at minimum, or a React/React-Native-friendly direction.
  - Avoid web-only-coupled choices that would force a rewrite for mobile.
- **Durable persistence is first-class.** The category's #1 complaint is data loss on logout/reinstall. Reliable cloud storage, cross-device sync, and user data export are core (not nice-to-have).
- **PWA is required, not optional.** Web push notifications — the delivery mechanism for the retention loop — require an installed PWA on iPhone. So PWA install support and an onboarding install nudge are core v1 work, and the app must be installable and serve a real offline-capable shell.

## Map / data notes

- One continuous zoomable map, shared data; world → country → admin-1 sub-region. Not two maps; no mode toggle.
- **Granularity is data-driven per country.** v1 uses standard admin-1 boundaries, which are locally meaningful by definition: US → states, Taiwan → counties/special municipalities (effectively its cities), Japan → prefectures, UK → constituent countries/regions. This resolves the "states don't fit Taiwan" problem without a global rule.
  - Implication: need a worldwide admin-1 boundary dataset (e.g. Natural Earth / GADM-class) with correct geometry and reasonable rendering performance at zoom.
  - **Geopolitics:** disputed borders and contested territories (Taiwan's status, disputed regions) need an explicit stance — which dataset, how borders/labels are drawn. Decide at architecture/data step.
- **Default "home view"** is user-chosen at onboarding (world vs a focus country) and changeable in settings; user lands on it at login. "Focus country" is not a separate "home country" concept — it is simply the country the user chose to focus on.

## Notification mechanism (for architecture / UX)

- **Delivery: web push + PWA install** (chosen over email-as-carrier for v1). Stays in-app and on-brand.
- **How it works (web push mechanism):**
  - A **service worker** (background script registered by the web app) runs even when no tab is open — this is what makes web notifications behave like app notifications.
  - The browser requests **notification permission** once; on grant, it returns a push subscription (VAPID-based) per device.
  - A **daily backend scheduler** computes each user's "on this day" memories and sends a push message to their subscription(s). The browser's push service (Google for Chrome/Android, Apple for Safari, Mozilla for Firefox) wakes the service worker, which shows a native OS notification. Tapping it deep-links into the map+memory view.
  - The user does **not** need the site open for this to fire.
- **Platform reach / the iPhone catch:**
  - Desktop (Chrome, Edge, Firefox, Safari) and Android Chrome: web push works in a normal browser tab, no install needed.
  - iPhone (iOS Safari): web push only works if the user has **added the app to their home screen** (installed the PWA, iOS 16.4+). A plain Safari tab gets no web push. This is Apple's restriction, not engineerable around — and is why the onboarding install nudge (FR17) is load-bearing.
- **Architecture to-dos:** service worker + Web Push API, VAPID key management, per-device subscription storage, daily "on this day" scheduler.
- **Content model:** specific memory text built from place + elapsed years (e.g. "2 years ago today: Kyoto"). Memory delivery, never an engagement nag ("you haven't logged in").
- **Re-live landing:** tap → map flies/zooms to the place, place highlighted, memory panel (photos + note) open simultaneously. Map + memory together, not a photo-slideshow-first view.
- **Open (UX):** cadence/throttling so qualifying memories stay welcome and don't become noise (per-memory vs. daily digest vs. cap).

## Parked / fast-follow ideas (post-MVP)

- Dedicated **city-pins within large admin-1 regions** (e.g. Los Angeles inside California) — separate points/pins data model; the real-cost piece deferred from the granularity decision.
- Auto-stitch photos + notes into a short **memory reel/video** (Polarsteps "trip reels" precedent).
- **"Want to go" / wishlist** state (dream-board layer).
- **Printable / wallpaper "trophy map"** (print is the category's highest-margin model).
- **Year-in-review** recap.
- **Fuzzy-time** granularity (season/year, not just exact date).
- **EXIF date pre-fill** from photo metadata (never auto-place on the map).
- **Photo clustering** into trips by timestamp.
- **Sharing / public map links** — deliberately deprioritized; private by design. ("Make it public" = open the product to more users, NOT public/social map sharing.)
