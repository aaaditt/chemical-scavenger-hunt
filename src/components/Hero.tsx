import type { ReactNode } from "react";
import { Halo } from "./Sprite";

/** Silkscreen's average advance is ~0.74em (HYDROGEN at 64px = 380px); 0.78 leaves a safety margin. */
const ADVANCE = 0.78;
const SIZES = [64, 48, 40, 32] as const;

/**
 * Largest Silkscreen size (64/48/40/32) whose longest line fits `width`. Two-word names wrap at the space
 * before dropping below 40px (critic round 2: long names overflowed at a fixed 64px).
 */
export function fitHero(text: string, width = 358): { size: number; lines: string[] } {
  const one = [text.toUpperCase()];
  const words = text.toUpperCase().split(" ");
  const two = words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : one;
  const fits = (lines: string[], s: number) => Math.max(...lines.map((l) => l.length)) * s * ADVANCE <= width;
  for (const s of SIZES) {
    if (fits(one, s)) return { size: s, lines: one };
    if (s <= 48 && words.length > 1 && fits(two, s)) return { size: s, lines: two };
  }
  return { size: 32, lines: two };
}

export function HeroName({ text, width = 358, className = "" }: { text: string; width?: number; className?: string }) {
  const { size, lines } = fitHero(text, width);
  return (
    <h1 className={`pf-${size} text-text text-center ${className}`} aria-label={text}>
      {lines.map((l, i) => <span key={i} className="block" aria-hidden>{l}</span>)}
    </h1>
  );
}

/** LED stamp above the hero (COLLECTED / UNSTABLE / SYNTHESIZED). */
export function Stamp({ children, tone = "led" }: { children: ReactNode; tone?: "led" | "iso" | "plain" | "frost" }) {
  const cls = { led: "led", iso: "bg-bench text-tier-isotope", plain: "bg-clinic text-ink", frost: "bg-frost text-ink" }[tone];
  const long = typeof children === "string" && children.length > 12;
  return <p className={`stamp inline-block px-4 py-3 ${long ? "pf-24" : "pf-32"} ${cls}`} style={{ boxShadow: "var(--shadow-px)" }}>{children}</p>;
}

/** Hero sprite on its stepped halo. The halo ends ≥16px above the name, so the name sits on plain wall. */
export function HeroStage({ glow, children, r = 40 }: { glow?: string; children: ReactNode; r?: number }) {
  return (
    <div className="relative grid place-items-center" style={{ height: r * 2 * 2 }}>
      {glow && <div className="absolute inset-0 grid place-items-center halo"><Halo r={r} color={glow} scale={2} q={4} /></div>}
      <div className="relative drop-in">{children}</div>
    </div>
  );
}

export function Chip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-2 px-2 h-10 ${className}`} style={{ boxShadow: "var(--shadow-px)" }}>{children}</span>;
}
