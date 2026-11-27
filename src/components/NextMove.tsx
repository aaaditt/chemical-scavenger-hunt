"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useGame } from "./GameProvider";
import { CatalystIcon, Sprite, TierVessel } from "./Sprite";
import { Burst } from "./Motion";
import { clock, msUntil, type MyState } from "@/lib/game";

type Move = { icon: ReactNode; title: string; body: string; cta: string; href: string; tone?: "candle" | "frost" | "iso" };

/** The single most useful thing this player can do right now. Derived from their real state, never generic. */
export function nextMove(s: MyState): Move {
  const p = s.player;
  const frozen = msUntil(p.frozen_until);
  const els = s.elements.length;
  const iso = s.events.find((e) => e.kind === "isotope_drop");
  if (frozen > 0)
    return { icon: <Sprite name="flake" scale={5} />, title: `Lab frozen for ${clock(frozen)}`, body: "You can't mix, but you can still scan QR codes and lend your catalyst.", cta: "What can I do?", href: "/frozen", tone: "frost" };
  if (iso)
    return { icon: <TierVessel tier="isotope" scale={3} />, title: "An isotope is loose right now", body: `${iso.label}. It's only out for ${clock(msUntil(iso.ends_at))}. Go find it.`, cta: "Scan", href: "/scan", tone: "iso" };
  if (els === 0)
    return { icon: <Sprite name="qr" scale={5} />, title: "Find your first QR code", body: "They're stuck on walls, doors and noticeboards around campus. Each one gives you an element.", cta: "Open the scanner", href: "/scan" };
  if (s.compounds.length === 0) {
    const has = new Set(s.elements.map((e) => e.symbol));
    const water = has.has("H") && has.has("O");
    return {
      icon: <Sprite name="n_mix" scale={5} />,
      title: "Make your first compound",
      body: water ? "You have hydrogen and oxygen. Water is H + H + O. Try it." : `You have ${els} element${els > 1 ? "s" : ""}. Read a riddle in the Hint Book and see what you can make.`,
      cta: water ? "Go to the mix bench" : "Open the Hint Book",
      href: water ? "/mix" : "/hints",
    };
  }
  if (p.lends_count === 0)
    return { icon: <CatalystIcon id={p.catalyst.id} scale={4} />, title: `Someone needs your ${p.catalyst.name}`, body: "Lend it from the Crew tab. You earn points every time a friend uses it to make something.", cta: "Lend my catalyst", href: "/crew" };
  if (els < 8)
    return { icon: <Sprite name="qr" scale={5} />, title: "Fill your shelf", body: `${els} of 25 elements found. More elements means more recipes you can make.`, cta: "Scan", href: "/scan" };
  return { icon: <Sprite name="n_book" scale={5} />, title: "Crack a harder riddle", body: "Rare and catalyzed compounds are worth the most. The Hint Book shows which ones nobody has made yet.", cta: "Open the Hint Book", href: "/hints" };
}

export function NextMove() {
  const { state } = useGame();
  const [done, setDone] = useState<string | null>(null);
  const m = state ? nextMove(state) : null;
  const title = m?.title.replace(/ for .*$/, "") ?? null;
  // When the goal changes because you achieved it, stamp the old one DONE before the new one rises in.
  useEffect(() => {
    if (!title) return;
    let prev: string | null = null;
    try { prev = sessionStorage.getItem("sc-next-move"); sessionStorage.setItem("sc-next-move", title); } catch {}
    if (prev && prev !== title && !prev.startsWith("Lab frozen") && !prev.startsWith("An isotope")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot celebration keyed to a state change
      setDone(prev);
      const t = setTimeout(() => setDone(null), 2200);
      return () => clearTimeout(t);
    }
  }, [title]);
  if (!state || !m) return null;
  if (done) {
    return (
      <section aria-live="polite" className="relative bg-clinic text-ink p-4 overflow-hidden" style={{ boxShadow: "var(--shadow-px-lift)" }}>
        <p className="font-num text-[14px]">Your next move</p>
        <h2 className="mt-3 font-num text-[20px] leading-[24px] line-through decoration-4">{done}</h2>
        <p className="slam absolute right-4 top-6 led px-3 py-2 pf-32">Done</p>
        <Burst />
      </section>
    );
  }
  const bg = { candle: "bg-candle", frost: "bg-frost", iso: "bg-tier-isotope" }[m.tone ?? "candle"];
  return (
    <section aria-label="Your next move" className={`${bg} text-ink p-4 rise`} style={{ boxShadow: "var(--shadow-px-lift)" }}>
      <p className="font-num text-[14px] leading-[16px]">Your next move</p>
      <div className="mt-3 flex gap-4 items-start">
        <span className="shrink-0 w-12 h-12 grid place-items-center bg-clinic" style={{ boxShadow: "var(--shadow-px)" }}>{m.icon}</span>
        <div className="min-w-0">
          <h2 className="font-num text-[20px] leading-[24px]">{m.title}</h2>
          <p className="mt-1 font-num text-[16px] leading-[22px]" style={{ fontWeight: 400 }}>{m.body}</p>
        </div>
      </div>
      <Link href={m.href} className="btn btn-dark w-full mt-4" style={{ color: "#dce7ee", background: "#0b1a19" }}>{m.cta}</Link>
    </section>
  );
}
