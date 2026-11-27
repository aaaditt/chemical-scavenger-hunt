"use client";
import { useEffect, useState } from "react";
import { useGame } from "@/components/GameProvider";
import { TIER_STYLE, type CompoundTier, type HintCard } from "@/lib/game";
import { rpc } from "@/lib/supabase";
import { Pips, Sprite } from "@/components/Sprite";
import { PIPS } from "@/lib/sprites";
import { NICK } from "@/lib/nicks";

/** "the tiny one" → "tin" (matches tiny/tinies); "the breath" → "breat". */
function nickStem(nick: string): string {
  const w = nick.replace(/^the\s+/i, "").split(/\s+/)[0].toLowerCase();
  return w.length > 4 ? w.slice(0, w.length - 1) : w.slice(0, 3);
}

const FILTERS: { id: "all" | "todo" | "unlocked" | CompoundTier; label: string }[] = [
  { id: "todo", label: "To make" },
  { id: "unlocked", label: "Recipes" },
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

  // Riddles talk in nicknames ("two tinies, one breath"). Rank the to-make list so riddles that mention
  // nicknames of elements you already hold come first; for a new lab that puts water on top.
  const mine = (state?.elements ?? []).map((e) => ({ symbol: e.symbol, nick: NICK[e.symbol] })).filter((e) => e.nick);
  const stems = mine.map((e) => nickStem(e.nick!)).filter(Boolean);
  const relevance = (c: HintCard) => stems.filter((st) => c.riddle.toLowerCase().includes(st)).length;
  const shown = (cards ?? [])
    .filter((c) => filter === "all" ? true : filter === "todo" ? !c.made : filter === "unlocked" ? !!c.locked_hint : c.tier === filter)
    .map((c, i) => ({ c, i, r: filter === "todo" ? relevance(c) : 0 }))
    .sort((a, b) => b.r - a.r || a.i - b.i)
    .map((x) => x.c);
  const legend = mine.length ? mine : [{ symbol: "H", nick: NICK.H }, { symbol: "O", nick: NICK.O }, { symbol: "C", nick: NICK.C }];

  return (
    <div>
      <h1 className="font-num text-[24px] text-text">Hint Book</h1>
      <p className="mt-2 font-num text-[16px] leading-[22px] text-fog" style={{ fontWeight: 400 }}>
        Each riddle describes one compound. Work out which elements it needs, then make it on the mix bench.
      </p>
      <p className="mt-2 font-num text-[16px] leading-[22px] text-fog" style={{ fontWeight: 400 }}>
        Stuck? <b className="text-text">Recipes</b> spell out the exact ingredients. You start with two, hint QRs give more, and your alliance shares theirs.
      </p>
      <section aria-label="Nicknames used in riddles" className="mt-4 panel-dark p-3">
        <p className="font-num text-[15px] text-text">{mine.length ? "Your elements' nicknames" : "Riddles use nicknames, for example"}</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {legend.map((e) => (
            <li key={e.symbol} className="bg-clinic text-ink px-2 py-1 font-num text-[14px] leading-[18px]" style={{ boxShadow: "var(--shadow-px)" }}>
              {e.symbol} <span style={{ fontWeight: 400 }}>= {e.nick}</span>
            </li>
          ))}
        </ul>
      </section>
      <div className="mt-4 flex gap-2" role="tablist">
        {FILTERS.map((f) => (
          <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}
            className={`btn ${filter === f.id ? "btn-plain" : "btn-dark"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {!cards && <p className="mt-10 text-center text-fog">Loading hint book…</p>}
      <ul className="mt-6 flex flex-col gap-6">
        {shown.map((c) => {
          const t = TIER_STYLE[c.tier];
          return (
            <li key={c.id} className={`p-4 ${c.made ? "panel-dark" : "panel-parch"}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="pf-16">{c.name ?? "Undiscovered"}</p>
                <span className="shrink-0 flex flex-col items-end gap-1">
                  <span className="font-num text-[16px]">{c.points} pts</span>
                  <Pips n={PIPS[c.tier] ?? 1} size={6} gap={3} />
                </span>
              </div>
              {c.formula && <p className="mt-1 font-num text-[18px]">{c.formula}</p>}
              <p className={`mt-2 font-num text-[14px] leading-[18px] ${c.made ? "text-fog" : "text-[#4a4420]"}`}>
                {t.label} · {c.slots} {c.slots === 1 ? "element" : "elements"}{c.needs_catalyst ? " · needs a catalyst" : ""}
                {c.first_by && ` · first made by ${c.first_by}`}
              </p>
              <p className="mt-3 font-num text-[16px] leading-[22px] italic">{c.riddle}</p>
              {c.locked_hint ? (
                <p className="mt-3 bg-tier-isotope text-ink px-3 py-2 font-num text-[16px] leading-[22px]" style={{ boxShadow: "var(--shadow-px)" }}>{c.locked_hint}</p>
              ) : c.has_locked_hint && !c.made ? (
                <p className="mt-3 flex items-center gap-2 font-num text-[14px] leading-[18px]"><Sprite name="lock" scale={2} /> Locked hint. Find a hint QR or ask around.</p>
              ) : null}
              {c.made && <p className="mt-3 pf-16 text-holo">In your lab</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
