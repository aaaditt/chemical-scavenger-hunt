"use client";
import { useEffect, useState } from "react";
import { useGame } from "@/components/GameProvider";
import { TIER_STYLE, type CompoundTier, type HintCard } from "@/lib/game";
import { rpc } from "@/lib/supabase";

const FILTERS: { id: "all" | "todo" | "unlocked" | CompoundTier; label: string }[] = [
  { id: "todo", label: "Not made" },
  { id: "unlocked", label: "Unlocked hints" },
  { id: "all", label: "All" },
];

export default function HintsPage() {
  const { state } = useGame();
  const [cards, setCards] = useState<HintCard[] | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("todo");

  const compoundCount = state?.compounds.length;
  useEffect(() => {
    rpc<{ data: HintCard[] }>("hint_book").then((r) => {
      if (r.ok) setCards((r as unknown as { data: HintCard[] }).data);
    });
  }, [compoundCount]);

  const shown = (cards ?? []).filter((c) =>
    filter === "all" ? true : filter === "todo" ? !c.made : filter === "unlocked" ? !!c.locked_hint : c.tier === filter
  );

  return (
    <div>
      <h1 className="wide text-2xl">Hint book</h1>
      <p className="mt-1 text-sm text-label-dim">
        Every compound has a riddle. Names appear once anyone on campus discovers them. Locked hints give the exact
        recipe — you start with two, find more on hint QRs, and share them with your alliance.
      </p>
      <div className="mt-4 flex gap-2" role="tablist">
        {FILTERS.map((f) => (
          <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1.5 text-sm ${filter === f.id ? "bg-label text-cobalt-900 font-semibold" : "border border-cobalt-600"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {!cards && <p className="mt-10 text-center text-label-dim">Loading hint book…</p>}
      <ul className="mt-4 space-y-3">
        {shown.map((c) => {
          const t = TIER_STYLE[c.tier];
          return (
            <li key={c.id} className={`rounded-label p-4 ${c.made ? "bg-cobalt-900/60" : "bg-label text-cobalt-900"}`}
              style={{ borderLeft: `6px solid ${c.tier === "basic" ? "#9aa8e6" : t.color}` }}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="wide text-base">{c.name ?? "Undiscovered"}{c.formula && <span className="ml-2 font-normal">{c.formula}</span>}</p>
                <p className="wide text-sm tabular-nums shrink-0">{c.points} pts</p>
              </div>
              <p className={`mt-0.5 text-xs ${c.made ? "text-label-dim" : "text-cobalt-700"}`}>
                {t.label} · {c.slots} {c.slots === 1 ? "element" : "elements"}{c.needs_catalyst ? " · needs a catalyst" : ""}
                {c.first_by && ` · first made by ${c.first_by}`}
              </p>
              <p className="mt-2 italic">{c.riddle}</p>
              {c.locked_hint ? (
                <p className="mt-2 rounded-label bg-uranium/90 text-cobalt-950 px-3 py-2 font-bold text-sm">🔓 {c.locked_hint}</p>
              ) : c.has_locked_hint && !c.made ? (
                <p className="mt-2 text-xs opacity-70">🔒 Locked hint — find a hint QR or ask around.</p>
              ) : null}
              {c.made && <p className="mt-2 text-sm text-verdigris font-semibold">✓ In your lab</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
