import { test as base, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

// Per-test data isolation for the shared anonymous session (test-infra, see e2e/auth.setup.ts).
// All tests reuse ONE anon user (storageState) to dodge the per-IP sign-in rate limit, so each
// test must start from a clean slate. This fixture deletes the user's OWN rows before each test —
// RLS-safe (uses the user's access token, never the service-role key), so it only ever touches
// this anon account's data.

// Playwright's runner doesn't load .env.local (Next does, for the app). Read the two public vars.
function fromEnvLocal(key: string): string {
  try {
    const m = readFileSync(".env.local", "utf8").match(new RegExp(`^${key}=(.*)$`, "m"));
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
  } catch {
    return "";
  }
}
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || fromEnvLocal("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  fromEnvLocal("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

async function accessToken(page: import("@playwright/test").Page): Promise<string | null> {
  const cookies = await page.context().cookies();
  const authCookie = cookies.find((c) => /-auth-token(\.\d+)?$/.test(c.name));
  if (!authCookie) return null;
  // @supabase/ssr may chunk the cookie (.0, .1, …) — concat in order.
  const base = authCookie.name.replace(/\.\d+$/, "");
  const raw = cookies
    .filter((c) => c.name === base || c.name.startsWith(`${base}.`))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => c.value)
    .join("");
  let json = decodeURIComponent(raw);
  if (json.startsWith("base64-")) json = Buffer.from(json.slice(7), "base64").toString("utf8");
  try {
    return JSON.parse(json).access_token ?? null;
  } catch {
    return null;
  }
}

async function resetData(page: import("@playwright/test").Page): Promise<void> {
  const token = await accessToken(page);
  if (!token || !SUPABASE_URL || !SUPABASE_KEY) return;
  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, Prefer: "return=minimal" };
  // Child → parent; `not.is.null` matches every row, RLS scopes the delete to this user.
  await page.request.delete(`${SUPABASE_URL}/rest/v1/photos?id=not.is.null`, { headers });
  await page.request.delete(`${SUPABASE_URL}/rest/v1/pins?id=not.is.null`, { headers });
  await page.request.delete(`${SUPABASE_URL}/rest/v1/region_marks?region_code=not.is.null`, { headers });
}

export const test = base.extend({
  page: async ({ page }, use) => {
    // Establish the session cookie (storageState) on the origin, then wipe this user's data so
    // the test starts empty — the same clean slate the old fresh-anon-per-test gave us, minus
    // the per-test sign-in that hit the rate limit.
    await page.goto("/");
    await resetData(page);
    await use(page);
  },
});

export { expect };
