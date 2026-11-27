"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bottle, Flask } from "@/components/Bottle";
import { useGame } from "@/components/GameProvider";
import { useFeed } from "@/components/Leaderboard";
import { Lamp } from "@/components/Sprite";
import { supabase } from "@/lib/supabase";
import type { Tier } from "@/lib/game";

type El = { symbol: string; name: string; tier: Tier };
const TIERS: { tier: Tier; title: string }[] = [
  { tier: "common", title: "Common shelf" },
  { tier: "uncommon", title: "Uncommon shelf" },
  { tier: "rare", title: "Rare cabinet" },
  { tier: "isotope", title: "Containment" },
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
  const feed = useFeed(1);
  useEffect(() => {
    supabase().from("elements").select("symbol,name,tier").order("points").then(({ data }) => setAll((data as El[]) ?? []));
  }, []);
  if (!state) return null;

  const owned = new Set(state.elements.map((e) => e.symbol));
  const ally = new Set(state.ally_elements);
  const latest = feed[0];

  return (
    <div>
      {/* Lab bench scene (ref-1): pinned notes + the lamp. Notes = latest campus news. */}
      <div className="flex items-end gap-4">
        <div className="panel-parch relative flex-1 p-4 pt-5">
          <span className="absolute left-1/2 -top-2 size-3 bg-alarm" style={{ boxShadow: "0 0 0 4px var(--color-ink)" }} aria-hidden />
          <p className="pf-16">Lab notes</p>
          <p className="mt-2 font-num text-[15px] leading-[20px]">
            {owned.size === 0
              ? "Shelves are empty. QR codes are hidden all over campus."
              : latest ? latest.message : `${owned.size} elements on your shelf. Keep hunting.`}
          </p>
        </div>
        <div className="shrink-0 pb-2"><Lamp scale={4} /></div>
      </div>
      <div className="shelf mt-2" />

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
          {owned.size === 0 && (
            <Link href="/scan" className="btn btn-primary w-full mt-6">Scan your first QR</Link>
          )}
          {TIERS.map(({ tier, title }) => {
            const els = all.filter((e) => e.tier === tier);
            if (!els.length) return null;
            const have = els.filter((e) => owned.has(e.symbol)).length;
            return (
              <section key={tier} className="mt-8">
                <h2 className="flex justify-between items-center mb-4 text-fog">
                  <span className="pf-16">{title}</span>
                  <span className="font-num text-[16px]">{have}/{els.length}</span>
                </h2>
                {chunk(els, 4).map((row, i) => (
                  <div key={i} className="mb-6">
                    <div className="grid grid-cols-4 gap-x-2 items-end">
                      {row.map((e) => (
                        <div key={e.symbol} className="flex justify-center">
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
