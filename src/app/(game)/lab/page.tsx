"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bottle, Flask } from "@/components/Bottle";
import { useGame } from "@/components/GameProvider";
import { supabase } from "@/lib/supabase";
import type { Tier } from "@/lib/game";

type El = { symbol: string; name: string; tier: Tier };
const TIERS: { tier: Tier; title: string }[] = [
  { tier: "common", title: "Common shelf" },
  { tier: "uncommon", title: "Uncommon shelf" },
  { tier: "rare", title: "Rare cabinet" },
  { tier: "isotope", title: "Containment" },
];

export default function LabPage() {
  const { state } = useGame();
  const [all, setAll] = useState<El[]>([]);
  useEffect(() => {
    supabase().from("elements").select("symbol,name,tier").order("points").then(({ data }) => setAll((data as El[]) ?? []));
  }, []);
  if (!state) return null;

  const owned = new Set(state.elements.map((e) => e.symbol));
  const ally = new Set(state.ally_elements);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="wide text-2xl">Your lab</h1>
        <p className="text-sm text-label-dim">{owned.size} elements · {state.compounds.length} compounds</p>
      </div>

      {owned.size === 0 && (
        <div className="mt-6 rounded-label bg-label text-cobalt-900 p-5">
          <p className="font-bold text-lg">Your shelves are empty.</p>
          <p className="mt-1">QR codes are hidden all over campus. Scan one to collect your first element.</p>
          <Link href="/scan" className="mt-4 inline-block rounded-label bg-cobalt-800 text-label px-5 py-3 font-semibold">Scan a code</Link>
        </div>
      )}

      {TIERS.map(({ tier, title }) => {
        const els = all.filter((e) => e.tier === tier);
        if (!els.length) return null;
        const have = els.filter((e) => owned.has(e.symbol)).length;
        return (
          <section key={tier} className="mt-7">
            <h2 className="flex justify-between text-sm text-label-dim mb-2">
              <span>{title}</span>
              <span className="tabular-nums">{have}/{els.length}</span>
            </h2>
            {/* The shelf: a plank under each row of bottles. */}
            <div className="grid grid-cols-4 gap-x-1 gap-y-4 pb-3 border-b-[6px] border-cobalt-950 rounded-b-sm">
              {els.map((e) => (
                <div key={e.symbol} className="flex justify-center">
                  <Bottle symbol={e.symbol} name={e.name} tier={e.tier} size={74}
                    empty={!owned.has(e.symbol) && !ally.has(e.symbol)} borrowed={!owned.has(e.symbol) && ally.has(e.symbol)} />
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <section className="mt-9">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="wide text-xl">Compounds</h2>
          <Link href="/hints" className="text-sm text-amber underline">Hint book</Link>
        </div>
        {state.compounds.length === 0 ? (
          <p className="text-label-dim">Nothing synthesized yet. Water is two hydrogens and an oxygen — try it on the mix bench.</p>
        ) : (
          <div className="grid grid-cols-3 gap-y-5">
            {[...state.compounds].reverse().map((c) => (
              <div key={c.id} className="flex justify-center">
                <Flask formula={c.formula} name={c.name} tier={c.tier} first={c.first} size={80} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
