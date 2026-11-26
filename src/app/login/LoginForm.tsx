"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const DOMAIN = "dubai.bits-pilani.ac.in";

function safeNext(n: string | null) {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/lab";
}

export function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const next = safeNext(params.get("next"));
  const [err, setErr] = useState<string | null>(params.get("error"));
  const [busy, setBusy] = useState(false);

  async function google() {
    setBusy(true);
    const { error } = await supabase().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        // `hd` tells Google to only offer accounts from the BITS Dubai Workspace. The database enforces it too.
        queryParams: { hd: DOMAIN, prompt: "select_account" },
      },
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
    }
  }

  async function devLogin(form: FormData) {
    setBusy(true);
    const { error } = await supabase().auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
    } else router.replace(next);
  }

  return (
    <div className="mt-auto pt-10">
      {err && (
        <p role="alert" className="mb-4 rounded-label bg-hazard/90 px-4 py-3 text-sm font-semibold">
          {/domain|only @|database error/i.test(err) ? `Only @${DOMAIN} accounts can play. Switch Google accounts and try again.` : err}
        </p>
      )}
      <button onClick={google} disabled={busy}
        className="w-full flex items-center justify-center gap-3 rounded-label bg-label text-cobalt-950 font-bold text-lg py-4 disabled:opacity-60">
        <GoogleG /> Continue with Google
      </button>
      <p className="mt-3 text-center text-sm text-label-dim">Only @{DOMAIN} accounts can play.</p>

      {process.env.NEXT_PUBLIC_DEV_LOGIN === "true" && (
        <form action={devLogin} className="mt-10 border-t border-cobalt-600 pt-6 space-y-3">
          <p className="text-sm text-amber">Dev login (local only)</p>
          <input name="email" type="email" defaultValue="player1@dubai.bits-pilani.ac.in" aria-label="Email"
            className="w-full rounded-label bg-cobalt-900 px-3 py-3" />
          <input name="password" type="password" defaultValue="devpassword" aria-label="Password"
            className="w-full rounded-label bg-cobalt-900 px-3 py-3" />
          <button disabled={busy} className="w-full rounded-label border border-amber text-amber py-3 font-semibold">Dev sign in</button>
        </form>
      )}
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
