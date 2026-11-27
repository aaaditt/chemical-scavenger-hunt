"use client";
import { useEffect, useState } from "react";
import { rpc } from "@/lib/supabase";
import { CatalystIcon, Hazard } from "@/components/Sprite";

const PF = (size: number) => ({ fontFamily: "var(--font-pixel)", fontSize: size, lineHeight: `${size}px` });

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

  if (err) return <Center><p className="font-num text-[32px] text-fog">{err === "not_revealed" ? "The finale is locked. Tick “Reveal catalysts” in the control room." : "Couldn't load the finale."}</p></Center>;
  if (!d) return <Center><p className="font-num text-[32px] text-fog">Loading…</p></Center>;

  return (
    <div className="h-dvh w-full cursor-pointer select-none bg-wall text-clinic" onClick={() => setStep((s) => Math.min(s + 1, slides.length - 1))}>
      <div key={step} className="h-full animate-pop">{slides[step]}</div>
      <p className="fixed bottom-8 right-8 font-num text-[24px] text-fog">{step + 1}/{slides.length}</p>
    </div>
  );
}

function buildSlides(d: FinaleData) {
  const max = Math.max(1, ...d.catalyst_demand.map((c) => c.lends));
  const award = (title: string, p: Person | null, detail: (p: Person) => string, color = "text-candle") =>
    p && (
      <Center key={title}>
        <p className="led inline-block px-6 py-4" style={PF(40)}>{title.toUpperCase()}</p>
        <p className={`font-num text-[120px] leading-none mt-12 ${color}`}>{p.display_name}</p>
        <p className="font-num text-[40px] mt-8">{detail(p)}</p>
      </Center>
    );
  return [
    <Center key="intro">
      <p style={PF(96)}>THE CATALYSTS</p><p className="text-candle mt-6" style={PF(96)}>ARE REVEALED.</p>
      <p className="font-num text-[40px] text-fog mt-12">{d.total_syntheses} compounds made · {d.discoveries} of {d.total_compounds} discovered</p>
    </Center>,
    <div key="demand" className="h-full p-20 flex flex-col justify-center">
      <p style={PF(64)}>WHO WAS EVERYONE HUNTING?</p>
      <ul className="mt-12 space-y-5">
        {d.catalyst_demand.map((c) => (
          <li key={c.id} className="flex items-center gap-6 text-4xl">
            <span className="w-16 grid place-items-center"><CatalystIcon id={c.id} scale={6} /></span>
            <span className="w-72 font-num text-[40px]">{c.name}</span>
            <span className="h-12 bg-candle" style={{ width: `${Math.round((c.lends / max) * 55)}%`, minWidth: 8, boxShadow: "var(--shadow-px)" }} />
            <span className="font-num text-[40px]">{c.lends}</span>
            <span className="font-num text-[28px] text-fog">{c.holders} holders</span>
          </li>
        ))}
      </ul>
    </div>,
    award("Most sought-after catalyst", d.sought_after, (p) => `${p.catalyst} · lent ${p.lends_count} times`),
    award("Biggest gambler", d.gambler, (p) => `${p.gambles} trips to the black market`, "text-hazard"),
    award("Most notorious traitor", d.traitor, (p) => `betrayed ${p.betrayals} alliance${Number(p.betrayals) > 1 ? "s" : ""}`, "text-alarm"),
    award("Master of the Obscure", d.niche, (p) => `${p.niche_points} points from rare compounds`, "text-tier-isotope"),
    award("Speed Chemist", d.speed, (p) => `${p.compounds_count} compounds`),
    <div key="top" className="h-full p-16 flex flex-col justify-center">
      <p style={PF(64)}>FINAL STANDINGS</p>
      <ol className="mt-10 space-y-3">
        {d.top.map((t, i) => (
          <li key={t.display_name} className={`flex items-center gap-8 px-8 py-3 font-num text-[40px] ${i === 0 ? "bg-candle text-ink" : i < 3 ? "bg-clinic text-ink" : "bg-bench"}`} style={{ boxShadow: "var(--shadow-px)" }}>
            <span className="w-14">{i + 1}</span>
            <span className="flex-1">{t.display_name}</span>
            <span className="text-[32px] flex items-center gap-3"><CatalystIcon id={t.catalyst.toLowerCase()} scale={4} /> {t.catalyst}</span>
            <span className="w-40 text-right">{t.score}</span>
          </li>
        ))}
      </ol>
    </div>,
  ].filter(Boolean);
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh w-full flex flex-col bg-wall text-clinic">
      <Hazard w={480} h={4} scale={4} className="w-full h-4" />
      <div className="flex-1 grid place-items-center text-center p-16"><div>{children}</div></div>
      <Hazard w={480} h={4} scale={4} className="w-full h-4" />
    </div>
  );
}
