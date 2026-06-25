import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Magic-link / email-confirm landing (Story 2.1). Supabase emails a one-time link to this route
// carrying a token_hash + type; verifyOtp exchanges it for the cookie-based SSR session (written
// via the server client's cookie wiring), then we redirect into the app. `type` is read from the
// link, so this handles whatever Supabase sends (anon→permanent email link, magic link, etc.).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Only honor same-origin relative paths — block //evil.com, /\evil, and absolute URLs (open redirect).
  const rawNext = searchParams.get("next") ?? "/";
  const next = /^\/(?![/\\])/.test(rawNext) ? rawNext : "/";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  // Invalid/expired link → land calmly back on the map with a flag (no hard error page).
  return NextResponse.redirect(`${origin}/?auth_error=link`);
}
