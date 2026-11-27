"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useGame } from "./GameProvider";
import { clock, msUntil } from "@/lib/game";
import { errorMessage } from "@/lib/messages";
import { supabase } from "@/lib/supabase";
import { CatalystIcon, Hazard, Sprite } from "./Sprite";

const TABS = [
  { href: "/lab", label: "Lab" },
  { href: "/mix", label: "Mix" },
  { href: "/scan", label: "Scan", primary: true },
  { href: "/hints", label: "Hints" },
  { href: "/crew", label: "Crew" },
];

export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return now;
}

// ── Day Shift: manual toggle only (organizer decision), remembered per device. ──
const shiftListeners = new Set<() => void>();
function readShift(): "day" | "night" {
  return typeof document !== "undefined" && document.documentElement.dataset.shift === "day" ? "day" : "night";
}
export function useShift(): ["day" | "night", () => void] {
  const shift = useSyncExternalStore(
    (cb) => { shiftListeners.add(cb); return () => shiftListeners.delete(cb); },
    readShift,
    () => "night" as const,
  );
  const toggle = () => {
    const next = readShift() === "day" ? "night" : "day";
    if (next === "day") document.documentElement.dataset.shift = "day";
    else delete document.documentElement.dataset.shift;
    try { localStorage.setItem("sc-shift", next); } catch {}
    shiftListeners.forEach((l) => l());
  };
  return [shift, toggle];
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
        <button className="btn btn-plain mt-6" onClick={() => supabase().auth.signOut()}>Sign out</button>
      </Splash>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh max-w-md w-full mx-auto">
      <TopBar />
      <Banners />
      <main className="flex-1 px-4 pb-36 pt-4">{children}</main>
      <nav aria-label="Game" className="fixed bottom-0 inset-x-0 z-30 pb-[env(safe-area-inset-bottom)] bg-bench" style={{ boxShadow: "0 -4px 0 0 var(--color-ink)" }}>
        <ul className="max-w-md mx-auto grid grid-cols-5 items-end h-[72px]">
          {TABS.map((t) => {
            const active = path.startsWith(t.href);
            return (
              <li key={t.href} className="flex justify-center items-center h-full">
                {t.primary ? (
                  <Link href={t.href} aria-label="Scan a QR code"
                    className="-mt-8 size-[88px] bg-candle text-ink flex flex-col items-center justify-center gap-2 active:translate-y-1"
                    style={{ boxShadow: "var(--shadow-px), inset 0 -8px 0 0 var(--color-candle-deep)" }}>
                    <Sprite name="qr" scale={4} />
                    <span className="pf-16">Scan</span>
                  </Link>
                ) : (
                  <Link href={t.href} aria-current={active ? "page" : undefined}
                    className={`pf-16 h-14 min-w-[60px] px-1 flex items-center justify-center ${active ? "bg-clinic text-ink" : "text-fog"}`}
                    style={active ? { boxShadow: "var(--shadow-px)" } : undefined}>
                    {t.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="fixed top-3 inset-x-0 z-50 flex flex-col items-center gap-3 px-4 pointer-events-none" aria-live="polite">
        {toasts.map((t) => (
          <p key={t.id} className={`stamp max-w-sm w-full px-4 py-3 font-num text-[16px] leading-[20px] ${
            { good: "bg-clinic text-ink", bad: "bg-alarm text-ink", info: "bg-parchment text-ink", rare: "bg-candle text-ink" }[t.tone]}`}
            style={{ boxShadow: "var(--shadow-px-lift)" }}>
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
  const [shift, toggleShift] = useShift();
  if (!state) return null;
  const p = state.player;
  return (
    <header className="px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2">
      <div className="flex items-stretch gap-3">
        {/* LED sign (ref-3 "LAB" door): the player's lab number from their college ID. */}
        <Link href="/settings" className="led px-3 flex items-center pf-24" aria-label={`Lab ${p.lab_no}. Open lab settings`}>
          LAB&nbsp;<span className="font-num text-[24px] leading-[24px]">{p.lab_no}</span>
        </Link>
        <Link href="/board" className="ml-auto flex gap-3" aria-label={`Score ${p.score}, rank ${p.rank}. Open leaderboard`}>
          <span className="bg-holo text-ink px-2 py-1 flex flex-col items-center justify-center min-w-[64px]" style={{ boxShadow: "var(--shadow-px)" }}>
            <span className="pf-16">Score</span>
            <span className="font-num text-[24px] leading-[24px]">{p.score}</span>
          </span>
          <span className="bg-holo text-ink px-2 py-1 flex flex-col items-center justify-center min-w-[56px]" style={{ boxShadow: "var(--shadow-px)" }}>
            <span className="pf-16">Rank</span>
            <span className="font-num text-[24px] leading-[24px]">#{p.rank}</span>
          </span>
        </Link>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={() => setReveal((r) => !r)}
          className={`btn ${reveal ? "btn-plain" : "btn-dark"} gap-2 normal-case`}
          aria-label={reveal ? `Your secret catalyst is ${p.catalyst.name}. Tap to hide` : "Tap to reveal your secret catalyst"}
        >
          <CatalystIcon id={p.catalyst.id} mystery={!reveal} scale={3} />
          <span className="pf-16">{reveal ? p.catalyst.name : "Catalyst"}</span>
        </button>
        <button onClick={toggleShift} className="btn btn-plain ml-auto gap-2" aria-label={shift === "day" ? "Switch to night shift" : "Switch to day shift (brighter, for sunlight)"}>
          <Sprite name={shift === "day" ? "moon" : "sun"} scale={3} />
          <span className="pf-16">{shift === "day" ? "Night" : "Day"}</span>
        </button>
        {p.is_admin && <Link href="/admin" className="btn btn-primary">Admin</Link>}
      </div>
    </header>
  );
}

function Banners() {
  const { state } = useGame();
  const now = useNow();
  if (!state) return null;
  const frozenMs = msUntil(state.player.frozen_until);
  const banners: ReactNode[] = [];
  const cls = "px-4 py-2 font-num text-[16px] leading-[20px]";
  if (state.settings.test_mode)
    banners.push(<p key="test" className={`${cls} bg-tier-isotope text-ink`}>Test server: progress may be wiped{state.player.is_test ? " · you're a test player" : ""}.</p>);
  if (state.settings.require_verification && !state.player.verified && !state.player.is_admin)
    banners.push(<p key="verify" className={`${cls} bg-candle text-ink`}>Waiting for an organizer to verify your account. Show this screen at the info desk.</p>);
  if (!state.settings.game_open && !state.player.is_admin)
    banners.push(<p key="closed" className={`${cls} bg-bench text-text`}>The lab is closed. Watch the Insta for opening time.</p>);
  if (frozenMs > 0)
    banners.push(
      <Link key="frozen" href="/frozen" className={`${cls} block bg-frost text-ink`}>
        <span className="pf-16">Lab frozen</span> · <span className="font-num">{clock(frozenMs)}</span> · what now?
      </Link>
    );
  for (const ev of state.events) {
    const left = clock(msUntil(ev.ends_at));
    if (ev.kind === "isotope_drop")
      banners.push(
        <div key={ev.id} className="bg-tier-isotope text-ink">
          <Hazard w={120} h={2} scale={4} className="w-full h-2" />
          <p className={cls}><span className="pf-16">Unstable</span> · {ev.label} · <span className="font-num">{left}</span></p>
        </div>
      );
    if (ev.kind === "black_market" && !ev.played)
      banners.push(
        <Link key={ev.id} href="/market" className={`${cls} block bg-ink text-hazard`}>
          <span className="pf-16">Black market</span> · <span className="font-num">{left}</span> · Enter
        </Link>
      );
  }
  void now;
  if (!banners.length) return null;
  return <div className="flex flex-col gap-1">{banners}</div>;
}

export function Splash({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <div className="min-h-dvh grid place-items-center text-center px-8">
      <div className="flex flex-col items-center">
        <p className="pf-32 text-text">Secret</p>
        <p className="pf-32 text-candle mt-2">Catalyst</p>
        <p className="mt-6 font-num text-[16px] text-fog">{text}</p>
        {children}
      </div>
    </div>
  );
}
