import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runOnThisDay } from "@/features/notifications/lib/on-this-day";

// Vercel Cron target (Story 5.3): once daily it sends each notifiable user one memory web-push.
// Route handlers default to the Node.js runtime (web-push needs Node crypto), and reading the
// request's Authorization header makes this handler inherently dynamic — so no `runtime`/`dynamic`
// segment config is set (Next 16 cacheComponents rejects an explicit `runtime` here anyway).
// SECRET-GUARDED — Vercel sends `Authorization: Bearer ${CRON_SECRET}` for cron invocations; anything
// else is 401, and we fail CLOSED when CRON_SECRET is unset so the job is never publicly triggerable
// (without this it would be a "spam every user" button). The clock + RNG are resolved here and
// injected into the orchestration. Cron runs only on deployed Vercel; locally, trigger with the
// Bearer header by hand.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  // Fail closed when CRON_SECRET is unset, then a constant-time compare (no per-byte timing leak).
  // The `!secret` short-circuit runs before timingSafeEqual, and the length check guards it (it
  // throws on unequal-length buffers).
  const authBuf = Buffer.from(request.headers.get("authorization") ?? "");
  const expectedBuf = Buffer.from(`Bearer ${secret ?? ""}`);
  if (
    !secret ||
    authBuf.length !== expectedBuf.length ||
    !timingSafeEqual(authBuf, expectedBuf)
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10); // UTC date — matches the 5-2 engine's comparison

  try {
    const summary = await runOnThisDay({ today, now: now.toISOString(), random: Math.random });
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    console.error("[mapsake] on-this-day run failed:", e);
    return NextResponse.json({ ok: false, error: "run-failed" }, { status: 500 });
  }
}
