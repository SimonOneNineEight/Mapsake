"use client";

import { useEffect, useRef, useState } from "react";
import { UserRound } from "lucide-react";
import { Drawer } from "vaul";
import { createClient } from "@/lib/supabase/client";
import { useExport } from "@/features/settings/hooks/use-export";
import { EnableNotifications } from "@/features/notifications/components/enable-notifications";
import { useAccount } from "../hooks/use-account";

// "Keep your map" sign-in (Story 2.1). A calm, local-first surface: an anonymous user enters their
// email and we LINK it to the current anon user (updateUser → anon→permanent, uid + map preserved),
// sending a one-time confirm link. A signed-in user sees their email + a quiet sign-out. Never a
// gate. Responsive like the memory panel: a centered modal on desktop (≥840px), a bottom sheet on
// phone. Reusable — the Story 2-3 post-payoff prompt opens this same surface.

type SendStatus = "idle" | "sending" | "sent" | "error-taken" | "error";

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

export function AccountSheet({ autoOpen = false }: { autoOpen?: boolean } = {}) {
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
  const exportData = useExport(); // "export my data" (Story 2.6) — signed-in only

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
    setStatus(taken ? "error-taken" : "error"); // → the returning-user sign-in below (Story 2.7)
  };

  // Returning-user sign-in (Story 2.7): the entered email already has an account, so sign INTO it
  // with a magic link — signInWithOtp({shouldCreateUser:false}), NOT updateUser (which links to the
  // anon user and is exactly what hit email_exists). This is the UNIVERSAL recovery: a magic link to
  // the email signs into that account whether it was created via email OR Google (both carry the
  // email). The link lands on /auth/confirm → cookie session for the existing account (a full reload,
  // so the uid-keyed caches reset). The on-device anon map is left in place — its merge is Story 2-8.
  // For an unknown email Supabase sends nothing (anti-enumeration); we still show the calm sent state
  // so we leak nothing.
  const signInExisting = async () => {
    if (status === "sending") return; // ignore a double-click while a send is in flight (one OTP)
    const value = email.trim();
    if (!looksLikeEmail(value)) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    const { error } = await createClient().auth.signInWithOtp({
      email: value,
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    setStatus(error ? "error" : "sent");
  };

  // Google sign-in (Story 2.2): link the Google identity to the CURRENT anon user (anon→permanent,
  // map preserved — parallel to the email link). On success supabase-js redirects the browser to
  // Google, so no code runs after; only an error (e.g. identity already linked) returns here.
  const signInGoogle = async () => {
    if (googleBusy) return; // ignore double-clicks — one in-flight link at a time
    setGoogleError(false);
    setGoogleBusy(true);
    try {
      const { error } = await createClient().auth.linkIdentity({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      // On success supabase-js redirects the browser to Google — no code runs after, and we keep
      // the button disabled through that navigation. Only an error returns here.
      if (error) {
        setGoogleError(true); // returning/already-linked path is Story 2-3/2-4
        setGoogleBusy(false);
      }
    } catch {
      setGoogleError(true); // network/unexpected failure — calm message, let them retry
      setGoogleBusy(false);
    }
  };

  const signOut = async () => {
    await createClient().auth.signOut();
    window.location.assign("/"); // middleware re-mints a fresh anonymous session
  };

  // Shared content for both the modal and the sheet.
  const body = signedIn ? (
    <div className="flex flex-col gap-3">
      <h2 className="font-serif text-xl font-medium text-foreground">你的地圖已保存</h2>
      <p className="text-sm text-muted-foreground">已登入：{account.email}</p>
      {/* Export my data (Story 2.6) — the keepsake trust guarantee: your memories are yours to take.
          A client-side, RLS-scoped JSON of marks/pins/notes/dates/photo refs. */}
      <button
        type="button"
        onClick={() => exportData.mutate()}
        disabled={exportData.isPending}
        className="self-start text-sm text-[rgb(var(--terracotta-text))] hover:underline disabled:opacity-60"
      >
        {exportData.isPending ? "正在為你整理回憶…" : "匯出我的回憶"}
      </button>
      {exportData.isError && (
        <p className="text-xs text-[rgb(var(--terracotta-text))]">這次沒能整理好，稍後再試一次</p>
      )}
      {/* Enable memory notifications (Story 5.1) — a quiet rider, capability-gated; self-contained
          so Settings (6-3) re-mounts it. Signed-in only (a subscription needs a durable account). */}
      <EnableNotifications />
      <button
        type="button"
        onClick={signOut}
        className="self-start text-sm text-[rgb(var(--terracotta-text))] hover:underline"
      >
        登出
      </button>
    </div>
  ) : status === "sent" ? (
    <div className="flex flex-col gap-2">
      <h2 className="font-serif text-xl font-medium text-foreground">查收你的信箱</h2>
      <p className="text-sm text-muted-foreground">
        我們寄了登入連結到 {email.trim()}，點開就完成登入。
      </p>
    </div>
  ) : (
    <div className="flex flex-col gap-3">
      <h2 className="font-serif text-xl font-medium text-foreground">保存你的地圖</h2>
      <p className="text-sm text-muted-foreground">登入後，你的地圖就能在不同裝置上保存。</p>
      {/* Calm notice after an auth redirect (Story 2.2). "existing" steers a returning user back to
          their original method; the actual sign-in + map merge is Story 2-3. */}
      {notice === "existing" && (
        <p className="text-sm text-[rgb(var(--terracotta-text))]">
          已用此信箱註冊，使用信箱登入回到你的地圖。
        </p>
      )}
      {notice === "oauth" && (
        <p className="text-sm text-[rgb(var(--terracotta-text))]">Google 登入沒有完成，請再試一次。</p>
      )}
      {notice === "link" && (
        <p className="text-sm text-[rgb(var(--terracotta-text))]">
          這個登入連結沒辦法用了，回到帳號重新寄一封就好。
        </p>
      )}
      {/* Google (Story 2.2) — alongside email so neither is the only path (no single-OAuth lock-in). */}
      <button
        type="button"
        onClick={signInGoogle}
        disabled={googleBusy}
        className="flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground hover:bg-accent disabled:opacity-60"
      >
        <GoogleG className="h-[18px] w-[18px] shrink-0" />
        {googleBusy ? "前往 Google…" : "用 Google 登入"}
      </button>
      {googleError && (
        <p className="text-sm text-[rgb(var(--terracotta-text))]">Google 登入暫時無法使用，請稍後再試</p>
      )}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />或<span className="h-px flex-1 bg-border" />
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
        placeholder="你的 email"
        aria-label="email"
        className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
      {status === "error-taken" && (
        <>
          <p className="text-sm text-[rgb(var(--terracotta-text))]">此信箱已有帳號</p>
          {/* Returning user (Story 2.7): sign INTO the existing account via a magic link (universal —
              works whether it was made with email or Google). The anon-map merge is Story 2-8. */}
          <button
            type="button"
            onClick={signInExisting}
            className="self-start text-sm text-[rgb(var(--terracotta-text))] hover:underline"
          >
            登入你的帳號
          </button>
        </>
      )}
      {status === "error" && (
        <p className="text-sm text-[rgb(var(--terracotta-text))]">無法寄送，請確認 email 後再試一次</p>
      )}
      <button
        type="button"
        onClick={sendLink}
        disabled={status === "sending"}
        className="self-start rounded-full bg-[rgb(var(--terracotta-text))] px-5 py-1.5 text-sm text-[rgb(var(--surface))] disabled:opacity-60"
      >
        {status === "sending" ? "寄送中…" : "寄送登入連結"}
      </button>
    </div>
  );

  return (
    <>
      <button
        type="button"
        aria-label="帳號"
        onClick={() => {
          setGoogleError(false); // don't carry a stale Google error into a fresh open
          setNotice(null);
          setOpen(true);
        }}
        className="absolute left-4 top-16 z-20 grid h-10 w-10 place-items-center rounded-full bg-card/95 text-foreground shadow-[0_2px_10px_rgba(58,46,34,0.18)]"
      >
        <UserRound className="h-5 w-5" aria-hidden />
      </button>

      {open &&
        (wide ? (
          // Desktop: a centered modal (matches the onboarding question card pattern).
          <div
            role="dialog"
            aria-modal="true"
            aria-label="帳號"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 grid place-items-center bg-[rgb(var(--map-frame))]/70 p-6"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-md bg-card p-6 shadow-[0_4px_16px_rgba(58,46,34,0.18)]"
            >
              <button
                type="button"
                aria-label="關閉"
                onClick={() => setOpen(false)}
                className="absolute right-3 top-3 text-xl leading-none text-muted-foreground"
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
                <Drawer.Title className="sr-only">帳號</Drawer.Title>
                <div className="mx-auto mb-4 mt-1 h-1.5 w-12 shrink-0 rounded-full bg-border" />
                {body}
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        ))}
    </>
  );
}
