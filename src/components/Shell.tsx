"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useGame } from "./GameProvider";
import { clock, msUntil } from "@/lib/game";
import { errorMessage } from "@/lib/messages";
import { supabase } from "@/lib/supabase";

const TABS = [
  { href: "/lab", label: "Lab", icon: "⚗" },
  { href: "/mix", label: "Mix", icon: "⚛" },
  { href: "/scan", label: "Scan", icon: "", primary: true },
  { href: "/hints", label: "Hints", icon: "✎" },
  { href: "/crew", label: "Crew", icon: "⚭" },
];

export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return now;
}

export function Shell({ children }: { children: ReactNode }) {
  const { status, state, error, toasts } = useGame();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (status === "signed_out") router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [status, path, router]);

  if (status === "loading" || status === "signed_out") return <Splash text="Opening your lab…" />;
  if (status === "error" || !state) {
    return (
      <Splash text={errorMessage(error ?? "network")}>
        <button className="mt-6 underline" onClick={() => supabase().auth.signOut()}>Sign out</button>
      </Splash>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh max-w-md w-full mx-auto">
      <TopBar />
      <Banners />
      <main className="flex-1 px-4 pb-32 pt-3">{children}</main>
      <nav aria-label="Game" className="fixed bottom-0 inset-x-0 z-30 pb-[env(safe-area-inset-bottom)] bg-cobalt-950/95 backdrop-blur border-t border-cobalt-700">
        <ul className="max-w-md mx-auto grid grid-cols-5 items-end">
          {TABS.map((t) => {
            const active = path.startsWith(t.href);
            return (
              <li key={t.href} className="flex justify-center">
                {t.primary ? (
                  <Link href={t.href} aria-label="Scan a QR code"
                    className="-mt-7 mb-2 size-16 rounded-full bg-amber text-cobalt-950 grid place-items-center shadow-[0_6px_0_var(--color-amber-deep)] active:translate-y-1 active:shadow-[0_2px_0_var(--color-amber-deep)] transition">
                    <ScanIcon />
                  </Link>
                ) : (
                  <Link href={t.href} aria-current={active ? "page" : undefined}
                    className={`flex flex-col items-center gap-0.5 py-2.5 w-full text-xs ${active ? "text-amber" : "text-label-dim"}`}>
                    <span aria-hidden className="text-xl leading-none">{t.icon}</span>
                    {t.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="fixed top-3 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none" aria-live="polite">
        {toasts.map((t) => (
          <p key={t.id} className={`animate-pop max-w-sm w-full rounded-label px-4 py-3 text-sm font-semibold shadow-lg ${
            { good: "bg-label text-cobalt-900", bad: "bg-hazard text-white", info: "bg-cobalt-600 text-label", rare: "bg-amber text-cobalt-950" }[t.tone]}`}>
            {t.text}
          </p>
        ))}
      </div>
    </div>
  );
}

function TopBar() {
  const { state } = useGame();
  const [reveal, setReveal] = useState(false);
  if (!state) return null;
  const p = state.player;
  return (
    <header className="flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2">
      <Link href="/board" className="flex items-baseline gap-2" aria-label={`Score ${p.score}, rank ${p.rank}. Open leaderboard`}>
        <span className="wide text-3xl tabular-nums">{p.score}</span>
        <span className="text-sm text-label-dim">pts · #{p.rank}</span>
      </Link>
      <button
        onClick={() => setReveal((r) => !r)}
        className="ml-auto rounded-full border border-cobalt-600 px-3 py-1.5 text-sm flex items-center gap-1.5"
        aria-label={reveal ? `Your secret catalyst is ${p.catalyst.name}. Tap to hide` : "Tap to reveal your secret catalyst"}
      >
        {reveal ? <><span aria-hidden>{p.catalyst.emoji}</span> {p.catalyst.name}</> : <><span aria-hidden>🔒</span> Catalyst</>}
      </button>
      {p.is_admin && <Link href="/admin" className="text-xs text-amber underline">Admin</Link>}
    </header>
  );
}

function Banners() {
  const { state } = useGame();
  const now = useNow();
  if (!state) return null;
  const frozenMs = msUntil(state.player.frozen_until);
  const banners: ReactNode[] = [];
  if (!state.settings.game_open && !state.player.is_admin)
    banners.push(<p key="closed" className="bg-cobalt-950 text-label-dim">The lab is closed. Watch the Insta for opening time.</p>);
  if (frozenMs > 0)
    banners.push(
      <p key="frozen" className="bg-ice text-cobalt-950 font-semibold">
        🧊 Lab frozen — <span className="wide tabular-nums">{clock(frozenMs)}</span>
      </p>
    );
  for (const ev of state.events) {
    const left = clock(msUntil(ev.ends_at));
    if (ev.kind === "isotope_drop")
      banners.push(<p key={ev.id} className="bg-uranium text-cobalt-950 font-semibold">☢️ Isotope loose: {ev.label} · {left}</p>);
    if (ev.kind === "black_market" && !ev.played)
      banners.push(
        <Link key={ev.id} href="/market" className="block bg-black text-amber font-semibold">🕶️ Black market open · {left} · Enter</Link>
      );
  }
  void now;
  if (!banners.length) return null;
  return <div className="[&>*]:px-4 [&>*]:py-2 [&>*]:text-sm">{banners}</div>;
}

export function Splash({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <div className="min-h-dvh grid place-items-center text-center px-8">
      <div>
        <p className="wide text-2xl mb-3">Secret Catalyst</p>
        <p className="text-label-dim">{text}</p>
        {children}
      </div>
    </div>
  );
}

function ScanIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10" />
    </svg>
  );
}
