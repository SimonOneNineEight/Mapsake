import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth callback (Story 2.2). Google → Supabase → here with a `code`; exchange it for the cookie-
// based SSR session, then redirect into the app. Separate from /auth/confirm (email uses verifyOtp
// + token_hash; OAuth uses exchangeCodeForSession + code). The middleware skips the anon bootstrap
// on /auth routes (Story 2.1), so this navigation won't mint a throwaway anon user.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only same-origin relative paths (no //evil.com, /\, or absolute URLs) — prevent open redirect.
  const rawNext = searchParams.get("next") ?? "/";
  const next = /^\/(?![/\\])/.test(rawNext) ? rawNext : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  // Failed/again exchange → land calmly back on the map (no hard error page).
  return NextResponse.redirect(`${origin}/?auth_error=oauth`);
}
