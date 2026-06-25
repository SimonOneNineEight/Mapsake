import { test, expect } from "./fixtures";
import { urlBase64ToUint8Array } from "../lib/push/vapid-key";

// Story 5.1 — the one reliably-testable unit. `pushManager.subscribe`'s applicationServerKey wants a
// Uint8Array, not the raw base64url VAPID string (the most common silent web-push failure), so this
// converter must decode correctly across the URL-safe alphabet (`-`→`+`, `_`→`/`) and restore padding.
// Runs in Node (the rollup pattern) — the subscribe flow + SW push handler need a prod build + real
// push (dev SW off, signed-in-only, VAPID-gated) and are covered by the manual checklist instead.

test.describe("urlBase64ToUint8Array (VAPID key decode)", () => {
  test("plain base64url with no special chars or padding", () => {
    // "TWFw" → "Map"
    expect([...urlBase64ToUint8Array("TWFw")]).toEqual([77, 97, 112]);
  });

  test("decodes the URL-safe '_' (standard '/')", () => {
    // "____" → three 0xFF bytes (24 bits all 1)
    expect([...urlBase64ToUint8Array("____")]).toEqual([255, 255, 255]);
  });

  test("decodes the URL-safe '-' (standard '+') and restores one '=' of padding", () => {
    // "--8" (len 3) → "++8=" → [0xFB, 0xEF]
    expect([...urlBase64ToUint8Array("--8")]).toEqual([251, 239]);
  });

  test("restores two '=' of padding (len % 4 === 2)", () => {
    // "Tw" → "Tw==" → "O"
    expect([...urlBase64ToUint8Array("Tw")]).toEqual([79]);
  });

  test("returns a Uint8Array (BufferSource for applicationServerKey)", () => {
    const out = urlBase64ToUint8Array("TWFw");
    expect(out).toBeInstanceOf(Uint8Array);
    expect(out.length).toBe(3);
  });
});
