# Deferred Work

## Deferred from: code review of story-1.1 (2026-06-21)

- **CJK UI weight 600 not loaded** — `app/layout.tsx` loads Noto Serif/Sans TC at 400/500/700; DESIGN.md specifies `ui` text at weight 600. No CJK UI strings render yet, so add 600 when real Chinese UI lands (Epic 3 / Story 6.1).
- **`metadataBase` uses `VERCEL_URL`** — `app/layout.tsx` points OG/canonical at the per-deploy preview URL. Pre-existing `with-supabase` starter pattern; switch to `VERCEL_PROJECT_PRODUCTION_URL` (or the real domain) when production deploy is set up.
- **Partial-env masking + non-null assertions** — `hasEnvVars` (`lib/utils.ts`) is a logical AND; if exactly one Supabase var is set, the app silently falls to pre-Supabase mode. The `lib/supabase/{client,server,proxy}.ts` clients use `!` non-null assertions and would throw if invoked with a missing key. Pre-existing starter behavior; harden when auth flows are built (Epic 2).
