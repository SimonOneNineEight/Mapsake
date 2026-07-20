# Epic 2 Retrospective — Capture the Trip & Prove the Migration

Date: 2026-07-19
Stories: 2.1–2.9 (all done, dev on Opus 4.8, review on Fable 5)
Format: focused — two findings that change what we do next, not a full ceremony.

## Outcome

Epic 2 closed on schedule. Nine stories through create → dev → 3-layer adversarial review → patch → commit, no thrash, no story reopened. The capture loop (search → fine-tune → date → photos → save → loop/recap), the multi-visit memory sheet, and edit/remove all exist in code and pass every local gate.

## Finding 1 — an entire epic of code has never run against a real database

Every story is green on `swift test`, the app build, SwiftLint, and a booted simulator. None of it has executed end-to-end even once, because the Simon-gated pieces are still unpushed:

- the 1.4 multi-visit migration (`visits` table + `promote_primary_visit` RPC),
- 2.8's `is_approximate` column,
- pin-photos Storage RLS confirmation for the anon principal.

So the proximity-merge write decision, the promote path, the additional-visit writes, and the photo-upload RLS are all unverified against live infra. The reviews kept catching exactly this class of defect (2.5's lowercase-path RLS, 2.9's stale-pin refetch) precisely because the simulator can't exercise it. Risk compounds the longer the push waits: the next epic will build on top of unproven ground.

**Action:** before Epic 3 dev, push 1.4 then 2.8 (dev → prod, `supabase gen types`), confirm Storage RLS, and run one real on-device pass of the capture loop + edit/delete. Treat surprises there as the true acceptance signal.

## Finding 2 — the review layer earns its keep on integration bugs, not logic bugs

2.5, 2.7, and 2.9 each shipped a genuine CRITICAL that unit tests passed clean over: an uppercase Storage path vs lowercase RLS, a photo viewer that couldn't stack over the presented sheet, and a pin sheet that never refetched its primary row so every rename/promote silently no-op'd on screen. The common shape: the model logic was correct, the live-integration behavior was wrong.

Two takeaways:
- Keep the Fable 3-layer review. It's finding real defects, not noise. The Acceptance Auditor layer (spec + architecture cross-check) caught the 2.9 stale-pin gap that pure diff review rationalized as fine.
- The remaining gap is live verification, not more unit coverage. Adding tests won't catch the next RLS/presentation/refetch bug; running against the real stack will.

## Carry-forward items (documented, not blocking)

- promote_primary_visit blind-retry guard (needs an expected-state key → a migration Simon pushes).
- Note null-clear stores `""` rather than SQL NULL (needs explicit-null PATCH support).
- 39 FR28 candidate strings + the Info.plist photo-usage string await Simon's blessing; the candidate gate stays red until then.
- 1-1 App Group / Keychain still deferred to Epic 3 (paid Apple account).

## What we keep doing

- One story at a time, dev then review in a fresh context on a different model.
- Additive, reversible migrations (2.8's `is_approximate` shipped as an additive column with a lenient decode bridge, so reads work pre-push).
- Value-type seams (EditSeam/PinReader in MapsakeModels) that keep the models layer testable and Supabase-free.
