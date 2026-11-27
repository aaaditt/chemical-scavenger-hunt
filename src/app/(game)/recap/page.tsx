"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { rpc } from "@/lib/supabase";
import { CatalystIcon, Sprite } from "@/components/Sprite";
import type { ReactNode } from "react";

type Recap = {
  name: string;
  catalyst: { id?: string; name: string; emoji: string };
  score: number;
  rank: number;
  players: number;
  elements: number;
  rarest_element: string | null;
  compounds: number;
  best_compound: string | null;
  firsts: string[];
  lends: number;
  catalysis_points: number;
  failed_mixes: number;
  gambles: string[];
  betrayals: number;
};

/** Wrapped-style recap: one stat per screen, tap to advance. Last slide links to the shareable card. */
export default function RecapPage() {
  const [r, setR] = useState<Recap | null>(null);
  const [i, setI] = useState(0);
  useEffect(() => {
    rpc<Recap>("my_recap").then((x) => x.ok && setR(x as unknown as Recap));
  }, []);
  if (!r) return <p className="py-20 text-center text-fog">Compiling your lab notes…</p>;

  const pct = r.players > 0 ? Math.max(1, Math.round((r.rank / r.players) * 100)) : 100;
  const wins = r.gambles.filter((g) => g !== "frozen").length;
  const slides: { big: ReactNode; line: string; tone?: string }[] = [
    { big: <CatalystIcon id={r.catalyst.id ?? r.catalyst.name.toLowerCase()} scale={12} />, line: `Your secret catalyst was ${r.catalyst.name}.` },
    { big: String(r.elements), line: r.rarest_element ? `elements collected. Rarest: ${r.rarest_element}.` : "elements collected." },
    { big: String(r.compounds), line: r.best_compound ? `compounds synthesized. Your best: ${r.best_compound}.` : "compounds synthesized." },
    ...(r.firsts.length ? [{ big: <Sprite name="star" scale={12} />, line: `First on campus to make ${r.firsts.join(", ")}.`, tone: "text-candle" }] : []),
    { big: String(r.lends), line: r.lends ? `times other labs needed you. That earned you ${r.catalysis_points} points.` : "times you lent your catalyst. Mysterious." },
    { big: String(r.failed_mixes), line: r.failed_mixes > 5 ? "failed mixes. Science is mostly failing." : "failed mixes. Precise." },
    ...(r.gambles.length ? [{ big: <Sprite name="haz" scale={12} />, line: `You gambled ${r.gambles.length} time${r.gambles.length > 1 ? "s" : ""} and won ${wins}.` }] : []),
    ...(r.betrayals ? [{ big: <Sprite name="smoke" scale={10} />, line: "You betrayed an alliance. They remember.", tone: "text-alarm" }] : []),
    { big: `#${r.rank}`, line: `of ${r.players} chemists with ${r.score} points. Top ${pct}%.`, tone: "text-candle" },
  ];
  const last = i === slides.length - 1;
  const s = slides[i];

  return (
    <div className="min-h-[70dvh] flex flex-col" onClick={() => !last && setI(i + 1)}>
      <div className="flex gap-1 mt-1" aria-hidden>
        {slides.map((_, k) => <span key={k} className={`h-2 flex-1 ${k <= i ? "bg-clinic" : "bg-moss"}`} />)}
      </div>
      <div key={i} className="flex-1 flex flex-col justify-center animate-pop">
        <div className={`pf-64 text-text ${s.tone ?? ""}`}>{s.big}</div>
        <p className="mt-6 font-num text-[24px] leading-[32px] max-w-[22ch]">{s.line}</p>
      </div>
      {last ? (
        <div className="flex gap-3">
          <a href={`/api/card/rank?name=${encodeURIComponent(r.name)}&rank=${r.rank}&score=${r.score}&compounds=${r.compounds}&catalyst=${encodeURIComponent(r.catalyst.emoji + " " + r.catalyst.name)}`}
            target="_blank" className="flex-1 btn btn-primary">Story card</a>
          <Link href="/lab" className="btn btn-plain">Done</Link>
        </div>
      ) : (
        <p className="text-center pf-16 text-fog">Tap to continue</p>
      )}
    </div>
  );
}
