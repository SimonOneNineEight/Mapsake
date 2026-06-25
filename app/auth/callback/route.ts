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
  // No code → GoTrue redirected here with the failure in the QUERY (PKCE flow; verified the
  // error_code lands server-side, e.g. ?error=invalid_request&error_code=email_exists). Branch on
  // the stable error_code into a precise, same-origin flag the landing page surfaces calmly. Reading
  // it here (not from a hash on `/`) keeps it cross-browser: the query reaches the server on every
  // browser, unlike a fragment, which Safari/Firefox may drop across the redirect.
  const errorCode = searchParams.get("error_code");
  const oauthError = searchParams.get("error");
  if (errorCode === "email_exists" || errorCode === "identity_already_exists") {
    // Returning user: this Google email already belongs to an account → steer them to sign in.
    // The actual returning-user sign-in + map merge is Story 2-3; here we just say so, calmly.
    return NextResponse.redirect(`${origin}/?auth_error=existing`);
  }
  if (oauthError === "access_denied") {
    // User cancelled the Google consent screen — intentional, so land quietly with no message.
    return NextResponse.redirect(`${origin}/`);
  }
  // Anything else (transient handshake/server error) → calm generic retry.
  return NextResponse.redirect(`${origin}/?auth_error=oauth`);
}
