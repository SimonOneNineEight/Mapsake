"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";
import { Drawer } from "vaul";
import { createClient } from "@/lib/supabase/client";
import { useAccount } from "../hooks/use-account";

// "Keep your map" sign-in (Story 2.1). A calm, local-first sheet: an anonymous user enters their
// email and we LINK it to the current anon user (updateUser → anon→permanent, uid + map preserved),
// sending a one-time confirm link. A signed-in user sees their email + a quiet sign-out. Never a
// gate. Reusable — the Story 2-3 post-payoff prompt opens this same sheet.

type SendStatus = "idle" | "sending" | "sent" | "error-taken" | "error";

const looksLikeEmail = (s: string) => /.+@.+\..+/.test(s.trim());

export function AccountSheet() {
  const account = useAccount();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SendStatus>("idle");

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
    setStatus(taken ? "error-taken" : "error"); // returning/cross-device path is Story 2-3/2-4
  };

  const signOut = async () => {
    await createClient().auth.signOut();
    window.location.assign("/"); // middleware re-mints a fresh anonymous session
  };

  const signedIn = !account.isAnonymous && Boolean(account.email);

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <button
          type="button"
          aria-label="帳號"
          className="absolute left-4 top-16 z-20 grid h-10 w-10 place-items-center rounded-full bg-card/95 text-foreground shadow-[0_2px_10px_rgba(58,46,34,0.18)]"
        >
          <UserRound className="h-5 w-5" aria-hidden />
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-30 bg-[rgb(var(--map-frame))]/40" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-h-[85dvh] max-w-md flex-col rounded-t-[18px] bg-card p-5 shadow-[0_-4px_16px_rgba(58,46,34,0.18)] outline-none"
        >
          <div className="mx-auto mb-4 mt-1 h-1.5 w-12 shrink-0 rounded-full bg-border" />
          {signedIn ? (
            <div className="flex flex-col gap-3">
              <Drawer.Title className="font-serif text-xl font-medium text-foreground">
                你的地圖已保存
              </Drawer.Title>
              <p className="text-sm text-muted-foreground">已登入：{account.email}</p>
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
              <Drawer.Title className="font-serif text-xl font-medium text-foreground">
                查收你的信箱
              </Drawer.Title>
              <p className="text-sm text-muted-foreground">
                我們寄了登入連結到 {email.trim()}，點開就完成登入。
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Drawer.Title className="font-serif text-xl font-medium text-foreground">
                保存你的地圖
              </Drawer.Title>
              <p className="text-sm text-muted-foreground">
                用 email 登入，你的地圖就能在不同裝置上保存。
              </p>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status !== "idle" && status !== "sending") setStatus("idle");
                }}
                placeholder="你的 email"
                aria-label="email"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              {status === "error-taken" && (
                <p className="text-sm text-[rgb(var(--terracotta-text))]">此信箱已有帳號</p>
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
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
