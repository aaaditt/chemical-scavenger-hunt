"use client";
import { useEffect, useState } from "react";
import { rpc } from "@/lib/supabase";

type Person = { display_name: string } & Record<string, string | number>;
type FinaleData = {
  catalyst_demand: { id: string; name: string; emoji: string; holders: number; lends: number }[];
  top: { display_name: string; score: number; compounds_count: number; emoji: string; catalyst: string }[];
  speed: Person | null; niche: Person | null; sought_after: Person | null; gambler: Person | null; traitor: Person | null;
  discoveries: number; total_compounds: number; total_syntheses: number;
};

/** Presenter-driven finale for the projector: press → / space / click to advance each reveal. */
export function Finale() {
  const [d, setD] = useState<FinaleData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    rpc<FinaleData>("finale").then((r) => (r.ok ? setD(r as unknown as FinaleData) : setErr(r.error)));
  }, []);

  const slides = d ? buildSlides(d) : [];
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (["ArrowRight", " ", "Enter"].includes(e.key)) setStep((s) => Math.min(s + 1, slides.length - 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [slides.length]);

  if (err) return <Center><p className="text-3xl text-label-dim">{err === "not_revealed" ? "The finale is locked. Tick “Reveal catalysts” in the control room." : "Couldn't load the finale."}</p></Center>;
  if (!d) return <Center><p className="text-3xl text-label-dim">Loading…</p></Center>;

  return (
    <div className="h-dvh w-full cursor-pointer select-none" onClick={() => setStep((s) => Math.min(s + 1, slides.length - 1))}>
      <div key={step} className="h-full animate-pop">{slides[step]}</div>
      <p className="fixed bottom-4 right-6 text-label-dim">{step + 1}/{slides.length}</p>
    </div>
  );
}

function buildSlides(d: FinaleData) {
  const max = Math.max(1, ...d.catalyst_demand.map((c) => c.lends));
  const award = (title: string, p: Person | null, detail: (p: Person) => string, color = "text-amber") =>
    p && (
      <Center key={title}>
        <p className="text-4xl text-label-dim">{title}</p>
        <p className={`wide text-[120px] leading-none mt-6 ${color}`}>{p.display_name}</p>
        <p className="text-4xl mt-6">{detail(p)}</p>
      </Center>
    );
  return [
    <Center key="intro">
      <p className="wide text-[110px] leading-none">The catalysts<br />are revealed.</p>
      <p className="text-4xl text-label-dim mt-8">{d.total_syntheses} compounds made · {d.discoveries} of {d.total_compounds} discovered</p>
    </Center>,
    <div key="demand" className="h-full p-20 flex flex-col justify-center">
      <p className="wide text-6xl">Which catalyst was everyone hunting?</p>
      <ul className="mt-12 space-y-5">
        {d.catalyst_demand.map((c) => (
          <li key={c.id} className="flex items-center gap-6 text-4xl">
            <span className="w-16 text-center">{c.emoji}</span>
            <span className="w-64">{c.name}</span>
            <span className="h-12 rounded-label bg-amber" style={{ width: `${(c.lends / max) * 55}%`, minWidth: 8 }} />
            <span className="wide tabular-nums">{c.lends}</span>
            <span className="text-2xl text-label-dim">{c.holders} holders</span>
          </li>
        ))}
      </ul>
    </div>,
    award("Most sought-after catalyst", d.sought_after, (p) => `${p.catalyst} · lent ${p.lends_count} times`),
    award("Biggest gambler", d.gambler, (p) => `${p.gambles} trips to the black market`, "text-label"),
    award("Most notorious traitor", d.traitor, (p) => `betrayed ${p.betrayals} alliance${Number(p.betrayals) > 1 ? "s" : ""}`, "text-hazard"),
    award("Master of the Obscure", d.niche, (p) => `${p.niche_points} points from rare compounds`, "text-uranium"),
    award("Speed Chemist", d.speed, (p) => `${p.compounds_count} compounds`),
    <div key="top" className="h-full p-16 flex flex-col justify-center">
      <p className="wide text-6xl">Final standings</p>
      <ol className="mt-10 space-y-3">
        {d.top.map((t, i) => (
          <li key={t.display_name} className={`flex items-center gap-8 rounded-label px-8 py-3 text-4xl ${i === 0 ? "bg-amber text-cobalt-950" : "bg-cobalt-900/80"}`}>
            <span className="wide w-14">{i + 1}</span>
            <span className="flex-1">{t.display_name}</span>
            <span className="text-3xl">{t.emoji} {t.catalyst}</span>
            <span className="wide tabular-nums w-40 text-right">{t.score}</span>
          </li>
        ))}
      </ol>
    </div>,
  ].filter(Boolean);
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="h-dvh w-full grid place-items-center text-center p-16"><div>{children}</div></div>;
}
