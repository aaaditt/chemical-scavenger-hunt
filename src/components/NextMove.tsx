"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { useGame } from "./GameProvider";
import { CatalystIcon, Sprite, TierVessel } from "./Sprite";
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
  if (!state) return null;
  const m = nextMove(state);
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
