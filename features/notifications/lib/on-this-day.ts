import { selectMemoryForDay } from "./eligibility";
import { buildPushPayload } from "./push-copy";
import { sendPush } from "@/lib/push/send";
import {
  deleteSubscription,
  getUserPins,
  getUserSubscriptions,
  listNotifiableUsers,
  recordNotified,
} from "@/data/notifications";

// The on-this-day orchestration (Story 5.3). SERVER-ONLY — pulls all notifiable users via the
// service role, runs Story 5-2's eligibility engine per user, sends one web-push to each of that
// user's devices, then records the ledger and prunes dead subscriptions. The actual tier logic
// lives in the engine; this is the thin "feed it, act on it" loop. Edge inputs (today/now/random)
// are injected so the route owns the clock and RNG.

export interface OnThisDaySummary {
  usersConsidered: number;
  skippedAlreadyToday: number;
  notified: number;
  pushesSent: number;
  pruned: number;
}

export interface OnThisDayContext {
  today: string; // YYYY-MM-DD (UTC)
  now: string; // ISO timestamp written to the ledger
  random: () => number; // [0,1) — the rediscovery pick
}

export async function runOnThisDay(ctx: OnThisDayContext): Promise<OnThisDaySummary> {
  const users = await listNotifiableUsers();
  const summary: OnThisDaySummary = {
    usersConsidered: users.length,
    skippedAlreadyToday: 0,
    notified: 0,
    pushesSent: 0,
    pruned: 0,
  };

  for (const user of users) {
    try {
      // Hard max one per day: skip a user already notified today (the ledger date, UTC). Holds
      // across reruns/retries of the same day's cron.
      if (user.lastNotifiedAt && user.lastNotifiedAt.slice(0, 10) === ctx.today) {
        summary.skippedAlreadyToday += 1;
        continue;
      }

      const memory = selectMemoryForDay(await getUserPins(user.id), {
        today: ctx.today,
        lastRediscoveryAt: user.lastRediscoveryAt,
        pick: (items) => items[Math.floor(ctx.random() * items.length)],
      });
      if (!memory) continue; // a legitimately quiet day for this user

      const subscriptions = await getUserSubscriptions(user.id);
      if (subscriptions.length === 0) continue; // enabled, but no device subscribed yet

      const payloadJson = JSON.stringify(buildPushPayload(memory));
      // Send to every device first (sendPush never throws — a transient failure on one device must
      // not abort the others). Collect dead endpoints; prune AFTER the stamp so neither a flaky send
      // nor a prune write can skip the ledger and re-open a same-day duplicate-push window.
      let anySent = false;
      const staleEndpoints: string[] = [];
      for (const sub of subscriptions) {
        const result = await sendPush(sub, payloadJson);
        if (result.ok) {
          anySent = true;
          summary.pushesSent += 1;
        } else if (result.stale) {
          staleEndpoints.push(sub.endpoint);
        }
      }

      // Stamp the ledger when at least one push went out (a user with only dead/failed devices is
      // retried next run rather than silently marked notified). This is the max-1/day guard.
      if (anySent) {
        await recordNotified(user.id, { rediscovery: memory.tier === "rediscovery", now: ctx.now });
        summary.notified += 1;
      }

      for (const endpoint of staleEndpoints) {
        await deleteSubscription(endpoint);
        summary.pruned += 1;
      }
    } catch (e) {
      // One user's failure must not sink the batch.
      console.error(`[mapsake] on-this-day failed for user ${user.id}:`, e);
    }
  }

  return summary;
}
