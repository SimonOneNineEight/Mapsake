"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { UserRound } from "lucide-react";
import { Drawer } from "vaul";
import { createClient } from "@/lib/supabase/client";
import { useAccount } from "../hooks/use-account";

// "Keep your map" sign-in (Stories 2.1/2.2/2.7). A calm, local-first surface. EMAIL: a new address
// LINKs to the current anon user (updateUser → anon→permanent, uid + map kept); an address that
// already has an account auto-sends a sign-in magic link instead (signInWithOtp), so the same
// "check your inbox" covers create and sign-in. The UI reveals nothing, though the updateUser
// 200-vs-422 is still a network-level oracle — close that with Supabase's email-enumeration
// protection. GOOGLE: a single
// signInWithOAuth that both signs up and signs in — a returning Google user lands in their existing
// account (a new one doesn't carry the anon map; email is the map-saving path). A signed-in user sees
// their email + a quiet link to Settings. Never a gate. Responsive like the memory panel: a centered
// modal on desktop (≥840px), a bottom sheet on phone. The Story 2-3 post-payoff prompt reuses it.

type SendStatus = "idle" | "sending" | "sent" | "error";

const looksLikeEmail = (s: string) => /.+@.+\..+/.test(s.trim());

// Split threshold (EXPERIENCE): ≥840px desktop modal; below = phone sheet (matches MemoryContainer).
function useIsWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 840px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return wide;
}

// Official multi-color Google "G" mark for the sign-in button (lucide ships no brand logos).
function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" className={className} aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

export function AccountSheet({
  autoOpen = false,
  onOpenSettings,
}: {
  autoOpen?: boolean;
  onOpenSettings?: () => void; // open the Settings sheet (Story 6.3) — closes this sheet first
} = {}) {
  const t = useTranslations("account");
  const account = useAccount();
  // signed in = a permanent (non-anon) session with an email; used by the body + the autoOpen guard.
  const signedIn = !account.isAnonymous && Boolean(account.email);
  const wide = useIsWide();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SendStatus>("idle");
  const [googleError, setGoogleError] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  // Auth error surfaced after a redirect back from /auth/callback or /auth/confirm. "existing" = the
  // Google/email already belongs to an account (returning user → steer them to sign in; the real
  // consolidation + map merge is Story 2-3). "oauth"/"link" = a calm generic retry.
  const [notice, setNotice] = useState<"existing" | "oauth" | "link" | null>(null);
  const handledUrl = useRef(false);
  const autoOpened = useRef(false);
  // Open Settings (Story 6.3) from this sheet — close this sheet first so they don't stack.
  const openSettings = () => {
    setOpen(false);
    onOpenSettings?.();
  };

  // Esc closes the desktop modal (vaul handles Esc for the phone sheet itself).
  useEffect(() => {
    if (!wide || !open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [wide, open]);

  // On load after an auth redirect, open the sheet with a calm notice, then scrub the flag from the
  // URL so a refresh/back won't re-trigger it. Query-only: the server puts the real error_code in the
  // query at /auth/callback, so we never read the hash (which Safari/Firefox can drop across redirects).
  useEffect(() => {
    if (handledUrl.current) return;
    handledUrl.current = true;
    const authError = new URLSearchParams(window.location.search).get("auth_error");
    if (authError !== "existing" && authError !== "oauth" && authError !== "link") return;
    const openWithNotice = () => {
      setNotice(authError);
      setOpen(true);
    };
    openWithNotice();
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  // Post-payoff "keep your map" prompt (Story 2.3): the shell sets autoOpen once, right after the
  // onboarding payoff, to open this same surface as a quiet keepsake invitation. One-shot — closing
  // it stays closed (the shell only sets autoOpen for an anon user who hasn't seen it).
  useEffect(() => {
    if (!autoOpen || autoOpened.current || signedIn) return; // never auto-open the prompt for a signed-in user
    autoOpened.current = true;
    const openOnce = () => setOpen(true);
    openOnce();
  }, [autoOpen, signedIn]);

  const sendLink = async () => {
    const value = email.trim();
    if (!looksLikeEmail(value)) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    const supabase = createClient();
    // Link the email to the CURRENT anonymous user → anon→permanent in place (uid + map kept).
    const { error } = await supabase.auth.updateUser(
      { email: value },
      { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    );
    if (!error) {
      setStatus("sent");
      return;
    }
    // Prefer the status/code (stable) over the English message text (locale-/version-fragile).
    const code = (error as { code?: string }).code;
    const taken =
      error.status === 422 ||
      code === "email_exists" ||
      code === "user_already_exists" ||
      /already|registered|exists|in use/i.test(error.message);
    if (!taken) {
      setStatus("error");
      return;
    }
    // Returning user (Story 2.7): the address already has an account, so AUTOMATICALLY sign INTO it
    // with a magic link — signInWithOtp({shouldCreateUser:false}), NOT updateUser (which links to the
    // anon user and is exactly what hit email_exists). No second tap: the backend decides create vs
    // sign-in, the user just sees "check your inbox" either way. Universal recovery — the magic link
    // signs into the account whether it was created via email OR Google (both carry the email). The
    // link lands on /auth/confirm → cookie session for the existing account; the on-device anon map is
    // left in place (its merge is Story 2-8). Enumeration: the UI shows the same calm "sent" state for
    // new, existing, and unknown addresses, so a user-facing observer learns nothing — but the
    // updateUser 200-vs-422 (and the extra OTP round-trip) is still a NETWORK-level oracle. Close it
    // at the platform: enable Supabase Auth's email-enumeration protection.
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: value,
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    setStatus(otpError ? "error" : "sent");
  };

  // Google sign-in + sign-up (Stories 2.2/2.7): a single signInWithOAuth that the backend resolves —
  // a returning Google user lands in their EXISTING account; a brand-new one gets a fresh account.
  // We deliberately do NOT linkIdentity here: linking attaches Google to the current anon user, which
  // dead-ends a returning user whose Google already owns an account (it can't be linked twice). The
  // cost is that a brand-new Google user doesn't carry the on-device anon map — the map-saving path
  // is email (which links); Google map carry-over is the deferred Story 2-8 merge. On success
  // supabase-js redirects the browser to Google, so no code runs after; only an error returns here.
  const signInGoogle = async () => {
    if (googleBusy) return; // ignore double-clicks — one in-flight sign-in at a time
    setGoogleError(false);
    setGoogleBusy(true);
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setGoogleError(true);
        setGoogleBusy(false);
      }
    } catch {
      setGoogleError(true); // network/unexpected failure — calm message, let them retry
      setGoogleBusy(false);
    }
  };

  // Shared content for both the modal and the sheet.
  const body = signedIn ? (
    <div className="flex flex-col gap-3">
      <h2 className="font-serif text-xl font-medium text-foreground">{t("mapSaved")}</h2>
      <p className="text-sm text-muted-foreground">{t("loggedInAs", { email: account.email ?? "" })}</p>
      {/* Notifications, data export + sign-out moved to the Settings sheet (Story 6.3). */}
      <button
        type="button"
        onClick={openSettings}
        className="self-start py-1.5 text-sm text-[rgb(var(--terracotta-text))] hover:underline"
      >
        {t("settings")}
      </button>
    </div>
  ) : status === "sent" ? (
    <div className="flex flex-col gap-2">
      <h2 className="font-serif text-xl font-medium text-foreground">{t("checkInbox")}</h2>
      <p className="text-sm text-muted-foreground">
        {t("checkInboxBody", { email: email.trim() })}
      </p>
    </div>
  ) : (
    <div className="flex flex-col gap-3">
      <h2 className="font-serif text-xl font-medium text-foreground">{t("saveMap")}</h2>
      <p className="text-sm text-muted-foreground">{t("saveMapDescription")}</p>
      {/* Calm notice after an auth redirect (Story 2.2). "existing" steers a returning user back to
          their original method; the actual sign-in + map merge is Story 2-3. */}
      {notice === "existing" && (
        <p className="text-sm text-[rgb(var(--terracotta-text))]">
          {t("noticeExisting")}
        </p>
      )}
      {notice === "oauth" && (
        <p className="text-sm text-[rgb(var(--terracotta-text))]">{t("noticeOauth")}</p>
      )}
      {notice === "link" && (
        <p className="text-sm text-[rgb(var(--terracotta-text))]">
          {t("noticeLink")}
        </p>
      )}
      {/* Google (Story 2.2) — alongside email so neither is the only path (no single-OAuth lock-in). */}
      <button
        type="button"
        onClick={signInGoogle}
        disabled={googleBusy}
        className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground hover:bg-accent disabled:opacity-60"
      >
        <GoogleG className="h-[18px] w-[18px] shrink-0" />
        {googleBusy ? t("googleRedirecting") : t("googleSignIn")}
      </button>
      {googleError && (
        <p className="text-sm text-[rgb(var(--terracotta-text))]">{t("googleError")}</p>
      )}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />{t("or")}<span className="h-px flex-1 bg-border" />
      </div>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        autoFocus
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (status !== "idle" && status !== "sending") setStatus("idle");
          if (notice) setNotice(null);
        }}
        placeholder={t("emailPlaceholder")}
        aria-label={t("emailPlaceholder")}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
      />
      {status === "error" && (
        <p className="text-sm text-[rgb(var(--terracotta-text))]">{t("sendError")}</p>
      )}
      <button
        type="button"
        onClick={sendLink}
        disabled={status === "sending"}
        className="inline-flex min-h-11 items-center self-start rounded-full bg-[rgb(var(--terracotta-text))] px-5 py-1.5 text-sm text-[rgb(var(--surface))] disabled:opacity-60"
      >
        {status === "sending" ? t("sending") : t("sendLink")}
      </button>
      {/* A quiet entry to Settings (Story 6.3) — preferences are managed there. */}
      <button
        type="button"
        onClick={openSettings}
        className="self-start py-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        {t("settings")}
      </button>
    </div>
  );

  return (
    <>
      <button
        type="button"
        aria-label={t("accountLabel")}
        onClick={() => {
          setGoogleError(false); // don't carry a stale Google error into a fresh open
          setNotice(null);
          setOpen(true);
        }}
        className="absolute left-4 top-16 z-20 grid h-11 w-11 place-items-center rounded-full bg-card/95 text-foreground shadow-[0_2px_10px_rgba(58,46,34,0.18)]"
      >
        <UserRound className="h-5 w-5" aria-hidden />
      </button>

      {open &&
        (wide ? (
          // Desktop: a centered modal (matches the onboarding question card pattern).
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("accountLabel")}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 grid place-items-center bg-[rgb(var(--map-frame))]/70 p-6"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[85dvh] w-full max-w-sm overflow-y-auto rounded-md bg-card p-6 shadow-[0_4px_16px_rgba(58,46,34,0.18)]"
            >
              <button
                type="button"
                aria-label={t("close")}
                onClick={() => setOpen(false)}
                className="absolute right-1 top-1 grid h-11 w-11 place-items-center text-xl leading-none text-muted-foreground"
              >
                ×
              </button>
              {body}
            </div>
          </div>
        ) : (
          // Phone: a bottom sheet (matches the memory/places sheets).
          <Drawer.Root open={open} onOpenChange={setOpen}>
            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 z-30 bg-[rgb(var(--map-frame))]/40" />
              <Drawer.Content
                aria-describedby={undefined}
                className="fixed inset-x-0 bottom-0 z-30 flex max-h-[85dvh] flex-col rounded-t-[18px] bg-card p-5 pb-8 shadow-[0_-4px_16px_rgba(58,46,34,0.18)] outline-none"
              >
                <Drawer.Title className="sr-only">{t("accountLabel")}</Drawer.Title>
                <div className="mx-auto mb-4 mt-1 h-1.5 w-12 shrink-0 rounded-full bg-border" />
                <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        ))}
    </>
  );
}
