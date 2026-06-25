// VAPID public key conversion (Story 5.1). PushManager.subscribe's `applicationServerKey` wants a
// BufferSource (Uint8Array), not the raw base64url VAPID string — passing the string throws
// InvalidCharacterError/InvalidAccessError (the most common silent web-push failure). This decodes
// the base64url public key to the byte array the API expects. Pure + side-effect-free (unit-tested).
export function urlBase64ToUint8Array(base64UrlString: string): Uint8Array<ArrayBuffer> {
  // base64url → base64: restore padding, then map the URL-safe alphabet back to standard.
  const padding = "=".repeat((4 - (base64UrlString.length % 4)) % 4);
  const base64 = (base64UrlString + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}
