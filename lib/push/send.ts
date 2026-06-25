import webpush from "web-push";

// web-push send wrapper (Story 5.3). SERVER-ONLY — `web-push` uses Node crypto, so this module must
// never reach a client/edge bundle (it's imported only by the on-this-day job). VAPID is configured
// once per process from env: the PUBLIC key is the same one the client subscribes with; the PRIVATE
// key (VAPID_PRIVATE_KEY) is server-only and signs the push. A 404/410 means the subscription is
// gone → the caller prunes it; other errors bubble to the per-user try/catch so one bad device
// never sinks the batch.

let vapidConfigured = false;

function ensureVapid(): void {
  if (vapidConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY — cannot send web-push.");
  }
  // The subject is a contact the push service can reach; overridable, with a sensible default.
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:hello@mapsake.app", publicKey, privateKey);
  vapidConfigured = true;
}

export interface SendTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// `stale:true` = the subscription is gone (404/410 → prune); `stale:false` = a transient failure
// (429/500/network) that should be logged and skipped WITHOUT aborting the rest of the user's
// devices. sendPush never throws on a send error — one flaky endpoint must not silence a user's
// other devices nor skip the ledger stamp (which would open a same-day duplicate-push window).
export type SendResult = { ok: true } | { ok: false; stale: boolean };

export async function sendPush(target: SendTarget, payloadJson: string): Promise<SendResult> {
  ensureVapid();
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      payloadJson,
    );
    return { ok: true };
  } catch (e) {
    const statusCode = (e as { statusCode?: number }).statusCode;
    const stale = statusCode === 404 || statusCode === 410;
    if (!stale) console.error("[mapsake] push send failed:", statusCode ?? e);
    return { ok: false, stale };
  }
}
