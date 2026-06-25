import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // If the env vars are not set, skip proxy check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // Local-first (Story 1.4): every visitor gets a durable Supabase session from the
  // first load — an ANONYMOUS one until they create an account — so marks persist
  // before sign-up. We bootstrap it here (the sign-in writes the auth cookies via
  // the setAll wiring above), replacing the starter's redirect-to-login.
  //
  // Bootstrap ONLY on a top-level GET navigation: prefetches and sub-resource hits
  // that arrive before the session cookie lands would each mint a separate anonymous
  // user (orphan auth.users/profiles rows). The try/catch keeps a thrown network error
  // (or a disabled anonymous-sign-in toggle) from breaking the request — we log and
  // serve the page session-less rather than block.
  const isPrefetch =
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch" ||
    (request.headers.get("sec-purpose") ?? "").includes("prefetch");
  const dest = request.headers.get("sec-fetch-dest");
  const isDocNavigation =
    request.method === "GET" && !isPrefetch && (!dest || dest === "document");
  // Skip the anon bootstrap on /auth routes (Story 2.1 review): minting a throwaway anonymous
  // user on the magic-link confirm navigation would orphan rows and race the verifyOtp exchange.
  const isAuthRoute = request.nextUrl.pathname.startsWith("/auth");
  if (!user && isDocNavigation && !isAuthRoute) {
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) console.error("[mapsake] anonymous sign-in failed:", error.message);
    } catch (e) {
      console.error("[mapsake] anonymous sign-in threw:", e);
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
