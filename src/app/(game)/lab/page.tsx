"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bottle, Flask } from "@/components/Bottle";
import { useGame } from "@/components/GameProvider";
import { NextMove } from "@/components/NextMove";
import { supabase } from "@/lib/supabase";
import type { Tier } from "@/lib/game";

type El = { symbol: string; name: string; tier: Tier };
const TIERS: { tier: Tier; title: string; blurb: string }[] = [
  { tier: "common", title: "Common shelf", blurb: "Easy to find. Every lab needs these." },
  { tier: "uncommon", title: "Uncommon shelf", blurb: "Fewer QR codes, more points." },
  { tier: "rare", title: "Rare cabinet", blurb: "Only a few bottles of each exist on campus. When they're gone, they're gone." },
  { tier: "isotope", title: "Containment", blurb: "Unstable isotopes only appear during timed drops. Watch the big screen." },
];

function chunk<T>(a: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
  return out;
}

export default function LabPage() {
  const { state } = useGame();
  const [all, setAll] = useState<El[]>([]);
  const [tab, setTab] = useState<"elements" | "compounds">("elements");
  const [openTier, setOpenTier] = useState<Tier | null>(null);
  useEffect(() => {
    supabase().from("elements").select("symbol,name,tier").order("points").then(({ data }) => setAll((data as El[]) ?? []));
  }, []);
  if (!state) return null;

  const owned = new Set(state.elements.map((e) => e.symbol));
  const ally = new Set(state.ally_elements);

  return (
    <div>
      <NextMove />

      <div className="mt-6 grid grid-cols-2 gap-4" role="tablist">
        {(["elements", "compounds"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`btn ${tab === t ? "btn-plain" : "btn-dark"}`}>
            {t === "elements" ? <>Elements <span className="font-num ml-2">{owned.size}/{all.length || "…"}</span></>
              : <>Compounds <span className="font-num ml-2">{state.compounds.length}</span></>}
          </button>
        ))}
      </div>

      {tab === "elements" && (
        <>
          {TIERS.map(({ tier, title, blurb }) => {
            const els = all.filter((e) => e.tier === tier);
            if (!els.length) return null;
            const have = els.filter((e) => owned.has(e.symbol)).length;
            // Locked cabinets stay folded until you own one, so a new lab isn't a wall of empty bottles.
            if (have === 0 && tier !== "common" && openTier !== tier) {
              return (
                <button key={tier} onClick={() => setOpenTier(tier)} className="mt-6 w-full panel-dark p-4 flex items-center gap-4 text-left">
                  <span className="shrink-0 opacity-70"><Bottle symbol="?" name={title} tier={tier} plate={false} empty /></span>
                  <span className="min-w-0">
                    <span className="block font-num text-[18px] text-text">{title} <span className="text-fog font-normal">0 of {els.length}</span></span>
                    <span className="block mt-1 font-num text-[15px] leading-[20px] text-fog" style={{ fontWeight: 400 }}>{blurb}</span>
                  </span>
                </button>
              );
            }
            return (
              <section key={tier} className="mt-8">
                <h2 className="flex justify-between items-baseline mb-1">
                  <span className="font-num text-[18px] text-text">{title}</span>
                  <span className="font-num text-[16px] text-fog">{have} of {els.length}</span>
                </h2>
                <p className="mb-4 font-num text-[15px] leading-[20px] text-fog" style={{ fontWeight: 400 }}>{blurb}</p>
                {chunk(els, 4).map((row, i) => (
                  <div key={i} className="mb-6">
                    <div className="grid grid-cols-4 gap-x-2 items-end">
                      {row.map((e, j) => (
                        <div key={e.symbol} className={`flex justify-center ${owned.has(e.symbol) ? "drop-in" : ""}`} style={{ animationDelay: `${(i * 4 + j) * 60}ms` }}>
                          <Bottle symbol={e.symbol} name={e.name} tier={e.tier} plate={false}
                            empty={!owned.has(e.symbol) && !ally.has(e.symbol)} borrowed={!owned.has(e.symbol) && ally.has(e.symbol)} />
                        </div>
                      ))}
                    </div>
                    <div className="shelf mt-1" />
                    <div className="grid grid-cols-4 gap-x-2 mt-3">
                      {row.map((e) => {
                        const has = owned.has(e.symbol), al = ally.has(e.symbol);
                        return (
                          <p key={e.symbol} className={`py-1 text-center font-num text-[14px] leading-[16px] truncate ${has || al ? "bg-clinic text-ink" : "text-fog"}`}
                            style={{ boxShadow: has || al ? "var(--shadow-px)" : "inset 0 0 0 4px var(--color-moss)" }}>
                            {e.name.replace(/\s*\(.*\)$/, "")}
                            {al && !has && <span className="block text-[12px]">ally</span>}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </section>
            );
          })}
        </>
      )}

      {tab === "compounds" && (
        <section className="mt-8">
          {state.compounds.length === 0 ? (
            <div className="panel-parch p-4">
              <p className="pf-16">Nothing brewed yet</p>
              <p className="mt-2 font-num text-[16px] leading-[22px]">Water is two hydrogens and an oxygen. Try it on the mix bench.</p>
              <Link href="/mix" className="btn btn-primary mt-4">Mix bench</Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-y-8 gap-x-2">
              {[...state.compounds].reverse().map((c) => (
                <div key={c.id} className="flex justify-center">
                  <Flask formula={c.formula} name={c.name} tier={c.tier} first={c.first} catalyst={c.catalyst} />
                </div>
              ))}
            </div>
          )}
          <Link href="/hints" className="btn btn-plain w-full mt-8">Hint book</Link>
        </section>
      )}
    </div>
  );
}
