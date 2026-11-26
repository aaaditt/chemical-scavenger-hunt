"use client";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Flask } from "@/components/Bottle";
import { useGame } from "@/components/GameProvider";
import { useNow } from "@/components/Shell";
import { TIER_STYLE, clock, displaySymbol, formatRecipe, msUntil, type CompoundTier } from "@/lib/game";
import { errorMessage } from "@/lib/messages";
import { rpc } from "@/lib/supabase";

type MixResult =
  | { ok: true; status: "success"; compound: { id: string; name: string; formula: string; tier: CompoundTier; points: number }; first: boolean; lender: string | null; lender_bonus: number | null }
  | { ok: true; status: "failed"; tries_left: number }
  | { ok: true; status: "frozen"; frozen_until: string }
  | { ok: true; status: "already_made"; name: string }
  | { ok: false; error: string };

export default function MixPage() {
  return (
    <Suspense>
      <MixBench />
    </Suspense>
  );
}

function MixBench() {
  const { state, refresh, toast } = useGame();
  const params = useSearchParams();
  const now = useNow();
  const [recipe, setRecipe] = useState<Record<string, number>>({});
  const [catalyst, setCatalyst] = useState<string>(() => params.get("cat")?.toUpperCase() ?? "");
  const [result, setResult] = useState<MixResult | null>(null);
  const [busy, setBusy] = useState(false);

  const available = useMemo(() => {
    if (!state) return [];
    const mine = state.elements.map((e) => ({ symbol: e.symbol, name: e.name, tier: e.tier, ally: false }));
    const ally = state.ally_elements.map((s) => ({ symbol: s, name: s, tier: "common" as const, ally: true }));
    return [...mine, ...ally];
  }, [state]);

  if (!state) return null;
  const frozenMs = msUntil(state.player.frozen_until);
  void now;
  const limit = state.settings.wrong_streak_limit;
  const triesLeft = limit - state.player.wrong_streak;
  const total = Object.values(recipe).reduce((a, b) => a + b, 0);

  const bump = (s: string, d: number) =>
    setRecipe((r) => {
      const q = Math.max(0, Math.min(99, (r[s] ?? 0) + d));
      const next = { ...r };
      if (q === 0) delete next[s];
      else next[s] = q;
      return next;
    });

  async function synthesize() {
    setBusy(true);
    const cat = catalyst.trim() || null;
    const r = (await rpc("synthesize", { p_recipe: recipe, p_catalyst: cat })) as MixResult;
    setBusy(false);
    if (!r.ok) {
      toast(errorMessage(r.error), "bad");
      return;
    }
    setResult(r);
    if (r.status === "success" || r.status === "frozen") {
      setRecipe({});
      setCatalyst("");
    }
    if (r.status === "failed" && cat && cat !== "OWN") setCatalyst(""); // lent codes burn on any attempt
    void refresh();
  }

  if (result?.ok && result.status === "success") {
    const c = result.compound;
    return (
      <div className="text-center py-6">
        <div className="animate-pop flex justify-center"><Flask formula={c.formula} name={c.name} tier={c.tier} size={150} first={result.first} /></div>
        <p className="mt-4 wide text-3xl">{c.name}</p>
        <p className="mt-1 text-sm" style={{ color: TIER_STYLE[c.tier].color }}>{TIER_STYLE[c.tier].label}</p>
        <p className="mt-3 wide text-4xl text-amber">+{c.points}</p>
        {result.first && <p className="mt-3 rounded-label bg-amber text-cobalt-950 font-bold px-4 py-2 inline-block">★ First on campus to make this</p>}
        {result.lender && <p className="mt-3 text-label-dim">{result.lender} lent the catalyst and earned +{result.lender_bonus}.</p>}
        <div className="mt-8 flex gap-3 justify-center">
          <button onClick={() => setResult(null)} className="rounded-label bg-amber text-cobalt-950 font-bold px-6 py-3">Mix again</button>
          <a href={`/api/card/compound?${new URLSearchParams({ player: state.player.display_name, name: c.name, formula: c.formula, tier: c.tier, points: String(c.points), first: result.first ? "1" : "0" })}`} target="_blank"
            className="rounded-label border border-cobalt-300 px-6 py-3">Share card</a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="wide text-2xl">Mix bench</h1>
        <p className={`text-sm ${triesLeft <= 1 ? "text-hazard font-bold" : "text-label-dim"}`}>
          {triesLeft} {triesLeft === 1 ? "try" : "tries"} before freeze
        </p>
      </div>

      {frozenMs > 0 && (
        <div className="mt-4 rounded-label bg-ice text-cobalt-950 p-4">
          <p className="font-bold">Lab frozen 🧊 <span className="wide tabular-nums">{clock(frozenMs)}</span></p>
          <p className="text-sm">Too many failed mixes. Use the time to talk to people and trade hints.</p>
        </div>
      )}

      {/* The flask: what's going in */}
      <section aria-label="Current mix" className="mt-4 rounded-glass border-2 border-dashed border-cobalt-300/60 p-4 min-h-28">
        {total === 0 ? (
          <p className="text-label-dim text-center py-6">Tap elements below to add them to the flask.</p>
        ) : (
          <>
            <p className="wide text-3xl text-center break-words">{formatRecipe(recipe)}</p>
            <ul className="mt-3 flex flex-wrap gap-2 justify-center">
              {Object.entries(recipe).map(([s, q]) => (
                <li key={s} className="flex items-center rounded-full bg-cobalt-900">
                  <button onClick={() => bump(s, -1)} className="px-3 py-1.5 text-lg" aria-label={`Remove one ${s}`}>−</button>
                  <span className="wide tabular-nums">{displaySymbol(s)}×{q}</span>
                  <button onClick={() => bump(s, 1)} className="px-3 py-1.5 text-lg" aria-label={`Add one ${s}`}>+</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Reagents */}
      <section className="mt-5">
        <h2 className="text-sm text-label-dim mb-2">Your reagents {state.ally_elements.length > 0 && <span className="text-verdigris">+ allies&apos; commons</span>}</h2>
        {available.length === 0 ? (
          <p className="text-label-dim">No elements yet. <Link href="/scan" className="underline text-amber">Scan some first.</Link></p>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {available.map((e) => (
              <button key={e.symbol} onClick={() => bump(e.symbol, 1)} aria-label={`Add ${e.name}`}
                className="relative aspect-square rounded-label bg-label text-cobalt-900 flex flex-col items-center justify-center active:scale-95 transition"
                style={{ boxShadow: `inset 0 5px 0 ${e.tier === "common" ? "#16246b" : TIER_STYLE[e.tier].color}` }}>
                <span className="wide text-xl leading-none">{displaySymbol(e.symbol)}</span>
                {e.ally && <span className="absolute bottom-0.5 text-[9px] text-verdigris font-bold">ALLY</span>}
                {recipe[e.symbol] && (
                  <span className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-amber text-cobalt-950 text-[11px] font-bold grid place-items-center">{recipe[e.symbol]}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Catalyst */}
      <section className="mt-6">
        <h2 className="text-sm text-label-dim mb-2">Catalyst (optional)</h2>
        <div className="flex gap-2">
          <button onClick={() => setCatalyst(catalyst === "OWN" ? "" : "OWN")}
            className={`rounded-label px-3 py-3 text-sm border ${catalyst === "OWN" ? "bg-amber text-cobalt-950 border-amber font-bold" : "border-cobalt-300"}`}>
            {state.player.catalyst.emoji} Use mine
          </button>
          <input value={catalyst === "OWN" ? "" : catalyst} onChange={(e) => setCatalyst(e.target.value.toUpperCase())}
            placeholder="Code from a friend" aria-label="Catalyst code from another player" maxLength={8}
            className="flex-1 min-w-0 rounded-label bg-cobalt-900 px-3 py-3 wide tracking-widest" />
        </div>
        <p className="mt-2 text-xs text-label-dim">A friend&apos;s code works for one attempt — it&apos;s used up even if the mix fails.</p>
      </section>

      <button onClick={synthesize} disabled={busy || total === 0 || frozenMs > 0}
        className="mt-6 w-full rounded-label bg-amber text-cobalt-950 font-bold text-lg py-4 shadow-[0_6px_0_var(--color-amber-deep)] active:translate-y-1 active:shadow-[0_2px_0_var(--color-amber-deep)] transition disabled:opacity-40 disabled:shadow-none">
        {busy ? "Reacting…" : "Synthesize"}
      </button>

      {result?.ok && (
        <p role="status" className={`mt-4 rounded-label p-3 text-sm font-semibold ${result.status === "failed" ? "bg-hazard animate-shake" : result.status === "frozen" ? "bg-ice text-cobalt-950" : "bg-cobalt-600"}`}>
          {result.status === "failed" && `Nothing happened. ${result.tries_left} ${result.tries_left === 1 ? "try" : "tries"} left before your lab freezes.`}
          {result.status === "frozen" && `The flask cracked. Your lab is frozen for ${state.settings.freeze_minutes} minutes.`}
          {result.status === "already_made" && `You've already made ${result.name}. Try something new.`}
        </p>
      )}
    </div>
  );
}
