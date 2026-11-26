"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { rpc } from "@/lib/supabase";

type Recap = {
  name: string;
  catalyst: { name: string; emoji: string };
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
  if (!r) return <p className="py-20 text-center text-label-dim">Compiling your lab notes…</p>;

  const pct = r.players > 0 ? Math.max(1, Math.round((r.rank / r.players) * 100)) : 100;
  const wins = r.gambles.filter((g) => g !== "frozen").length;
  const slides: { big: string; line: string; tone?: string }[] = [
    { big: r.catalyst.emoji, line: `Your secret catalyst was ${r.catalyst.name}.` },
    { big: String(r.elements), line: r.rarest_element ? `elements collected. Rarest: ${r.rarest_element}.` : "elements collected." },
    { big: String(r.compounds), line: r.best_compound ? `compounds synthesized. Your best: ${r.best_compound}.` : "compounds synthesized." },
    ...(r.firsts.length ? [{ big: "★", line: `First on campus to make ${r.firsts.join(", ")}.`, tone: "text-amber" }] : []),
    { big: String(r.lends), line: r.lends ? `times other labs needed you. That earned you ${r.catalysis_points} points.` : "times you lent your catalyst. Mysterious." },
    { big: String(r.failed_mixes), line: r.failed_mixes > 5 ? "failed mixes. Science is mostly failing." : "failed mixes. Precise." },
    ...(r.gambles.length ? [{ big: "🎲", line: `You gambled ${r.gambles.length} time${r.gambles.length > 1 ? "s" : ""} and won ${wins}.` }] : []),
    ...(r.betrayals ? [{ big: "🗡", line: "You betrayed an alliance. They remember.", tone: "text-hazard" }] : []),
    { big: `#${r.rank}`, line: `of ${r.players} chemists with ${r.score} points. Top ${pct}%.`, tone: "text-amber" },
  ];
  const last = i === slides.length - 1;
  const s = slides[i];

  return (
    <div className="min-h-[70dvh] flex flex-col" onClick={() => !last && setI(i + 1)}>
      <div className="flex gap-1 mt-1" aria-hidden>
        {slides.map((_, k) => <span key={k} className={`h-1 flex-1 rounded-full ${k <= i ? "bg-label" : "bg-cobalt-600"}`} />)}
      </div>
      <div key={i} className="flex-1 flex flex-col justify-center animate-pop">
        <p className={`wide text-[88px] leading-none ${s.tone ?? ""}`}>{s.big}</p>
        <p className="mt-4 text-2xl max-w-[22ch]">{s.line}</p>
      </div>
      {last ? (
        <div className="flex gap-3">
          <a href={`/api/card/rank?name=${encodeURIComponent(r.name)}&rank=${r.rank}&score=${r.score}&compounds=${r.compounds}&catalyst=${encodeURIComponent(r.catalyst.emoji + " " + r.catalyst.name)}`}
            target="_blank" className="flex-1 text-center rounded-label bg-amber text-cobalt-950 font-bold py-3">Get story card</a>
          <Link href="/lab" className="rounded-label border border-cobalt-300 px-5 py-3">Done</Link>
        </div>
      ) : (
        <p className="text-center text-sm text-label-dim">Tap to continue</p>
      )}
    </div>
  );
}
