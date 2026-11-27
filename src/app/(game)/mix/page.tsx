"use client";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useGame } from "@/components/GameProvider";
import { Chip, HeroName, HeroStage, Stamp } from "@/components/Hero";
import { useNow } from "@/components/Shell";
import { CatalystIcon, CompoundVessel, Lamp, Sprite } from "@/components/Sprite";
import { TIER_STYLE, clock, displaySymbol, msUntil, type CompoundTier } from "@/lib/game";
import { errorMessage } from "@/lib/messages";
import { NICK } from "@/lib/nicks";
import { CAT_COLOR, LIQ, compoundLiquid, isCatalyst, type Liquid } from "@/lib/sprites";
import { rpc } from "@/lib/supabase";

type MixResult =
  | { ok: true; status: "success"; compound: { id: string; name: string; formula: string; tier: CompoundTier; points: number; catalyst?: string | null }; first: boolean; lender: string | null; lender_bonus: number | null }
  | { ok: true; status: "failed"; tries_left: number }
  | { ok: true; status: "frozen"; frozen_until: string }
  | { ok: true; status: "already_made"; name: string }
  | { ok: false; error: string };

const RUN_MS = 1600; // design: RUNNING frame, input locked

/** "H ×2 + O ×1" in display symbols. */
function mixLabel(r: Record<string, number>): string {
  return Object.entries(r).map(([k, q]) => `${displaySymbol(k)} ×${q}`).join(" + ");
}

export default function MixPage() {
  return (
    <Suspense>
      <MixBench />
    </Suspense>
  );
}

/** The apparatus rack (ref-4): a test tube per reagent piped into the flask over the lamp. */
function Rig({ symbols, liquid, failed, count = 0 }: { symbols: string[]; liquid: Liquid; failed: boolean; count?: number }) {
  const tubes = symbols.slice(0, 5);
  const pipe = liquid === "empty" ? "var(--color-clinic)" : LIQ[liquid].L;
  return (
    <div className="panel-dark relative h-[200px] px-4 pt-4 overflow-hidden" aria-hidden>
      <div className={`absolute right-24 top-3 alarm-lamp`}>
        <Sprite name={failed ? "alarmOn" : "alarmOff"} scale={4} className={failed ? "blink" : ""} />
      </div>
      <div className="flex items-start gap-3 h-[96px]">
        {tubes.length === 0 && <p className="font-num text-[15px] text-fog mt-6">Add reagents below.</p>}
        {tubes.map((s) => (
          <div key={s} className="relative flex flex-col items-center">
            <Sprite name="tube" scale={4} pal={LIQ[liquid === "empty" ? "common" : liquid]} />
            <span className="absolute top-2 bg-clinic text-ink font-num text-[12px] leading-[16px] px-1 min-w-[24px] text-center">{displaySymbol(s)}</span>
          </div>
        ))}
      </div>
      {/* Pipe: hard 4px line, filled with liquid while running. */}
      <div className="absolute left-4 right-[112px] top-[108px] h-1" style={{ background: tubes.length ? pipe : "var(--color-moss)" }} />
      <div className="absolute right-[108px] top-[60px] w-1 h-[52px]" style={{ background: tubes.length ? pipe : "var(--color-moss)" }} />
      <div className="absolute right-4 bottom-2 flex flex-col items-center">
        {failed && <div className="absolute -top-10 left-0 smoke-up"><Sprite name="smoke" scale={3} /></div>}
        {liquid === "empty" ? (
          <div className="relative">
            <CompoundVessel liquid="empty" scale={4} still />
            <div className="absolute inset-0" style={{ clipPath: `inset(${[100, 75, 62, 48, 40][Math.min(4, count)]}% 0 0 0)` }}>
              <CompoundVessel liquid="common" scale={4} still />
            </div>
          </div>
        ) : (
          <CompoundVessel liquid={liquid} scale={4} still={false} />
        )}
        <Lamp scale={3} />
      </div>
    </div>
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
  const [running, setRunning] = useState<Liquid | null>(null);
  const [lastMix, setLastMix] = useState("");

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
  const strikes = state.player.wrong_streak;
  const total = Object.values(recipe).reduce((a, b) => a + b, 0);
  const nameOf = (s: string) => available.find((a) => a.symbol === s)?.name ?? s;

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
    setResult(null);
    const cat = catalyst.trim() || null;
    setLastMix(mixLabel(recipe));
    setRunning(cat === "OWN" && isCatalyst(state!.player.catalyst.id) ? state!.player.catalyst.id : "uncommon");
    const [r] = await Promise.all([
      rpc("synthesize", { p_recipe: recipe, p_catalyst: cat }) as Promise<MixResult>,
      new Promise((res) => setTimeout(res, RUN_MS)),
    ]);
    setBusy(false);
    setRunning(null);
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
    const own = state.compounds.find((x) => x.id === c.id);
    const cat = c.catalyst ?? own?.catalyst ?? null;
    const liq = compoundLiquid(c.tier, cat);
    const card = new URLSearchParams({ player: state.player.public_name ?? state.player.display_name, lab: state.player.lab_no, name: c.name, tier: c.tier, points: String(c.points), first: result.first ? "1" : "0" });
    return (
      <div className="text-center pt-2 pb-6">
        <Stamp>Synthesized</Stamp>
        <div className="mt-6">
          <HeroStage glow={c.tier === "basic" ? undefined : LIQ[liq].L} burst={[LIQ[liq].L, LIQ[liq].H, "#ffb547", "#8df25f"]}>
            <CompoundVessel liquid={liq} scale={8} legendary={c.tier === "legendary"} />
          </HeroStage>
        </div>
        <div className="mt-4"><HeroName text={c.name} /></div>
        <div className="mt-4 flex gap-3 justify-center items-center flex-wrap">
          <span className="font-num text-[28px] text-text">{c.formula}</span>
          {isCatalyst(cat) && (
            <span className="inline-flex items-center gap-2 px-2 h-10 text-ink" style={{ background: CAT_COLOR[cat], boxShadow: "var(--shadow-px)" }}>
              <CatalystIcon id={cat} scale={3} /><span className="pf-16">{cat}</span>
            </span>
          )}
          <Chip className="bg-holo text-ink"><span className="font-num text-[24px]">+{c.points}</span></Chip>
        </div>
        <div className="mt-6 panel-parch relative p-4 text-left">
          {result.first && <span className="absolute right-4 -top-2 size-3 bg-alarm" style={{ boxShadow: "0 0 0 4px var(--color-ink)" }} aria-hidden />}
          <p className="pf-16">{result.first ? "First in the lab" : TIER_STYLE[c.tier].label}</p>
          <p className="mt-2 font-num text-[16px] leading-[22px]">
            {result.first ? `Nobody on campus had made ${c.name} until ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}. Your name is in the book now.` : `${c.name} is on your shelf.`}
          </p>
          {result.lender && (
            <p className="mt-3 pt-3 font-num text-[16px] leading-[22px]" style={{ boxShadow: "inset 0 4px 0 0 var(--color-parchment-shade)" }}>
              +{result.lender_bonus} to {result.lender} for the catalyst. Be nice to {result.lender}.
            </p>
          )}
        </div>
        {/* Sits BELOW the note in normal flow (round-2 critic: it used to slide under the note). */}
        <p className="mt-4 font-num text-[15px] leading-[20px] text-fog">Your post shows the name and the time. The catalyst stays sealed.</p>
        <div className="mt-6 grid grid-cols-[1fr_1.5fr] gap-4">
          <button onClick={() => setResult(null)} className="btn btn-plain">Bench</button>
          <a href={`/api/card/compound?${card}`} target="_blank" rel="noopener" className="btn btn-primary">Post it</a>
        </div>
      </div>
    );
  }

  // A lab with nothing on the shelf gets one clear instruction instead of an empty rig.
  if (available.length === 0) {
    return (
      <div>
        <h1 className="led self-start inline-block px-3 py-2 pf-24">Mix bench</h1>
        <div className="mt-6 panel-parch p-4">
          <p className="font-num text-[20px] leading-[24px]">Your bench is empty</p>
          <p className="mt-2 font-num text-[16px] leading-[22px]" style={{ fontWeight: 400 }}>
            This is where you combine elements into compounds, but you don&apos;t have any elements yet. Scan a QR code around campus to get your first one.
          </p>
          <Link href="/scan" className="btn btn-primary w-full mt-4">Open the scanner</Link>
        </div>
        <div className="mt-8 flex justify-center opacity-60" aria-hidden><CompoundVessel liquid="empty" scale={8} still /></div>
      </div>
    );
  }

  const failed = result?.ok === true && (result.status === "failed" || result.status === "frozen");
  const rigLiquid: Liquid = running ?? (failed ? "sludge" : "empty");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="led px-3 py-2 pf-24">Mix bench</h1>
        <div className="flex flex-col items-end gap-1">
          <span className="pf-16 text-fog">Bad mixes</span>
          <span className="flex gap-2" aria-label={`${strikes} of ${limit} bad mixes`}>
            {Array.from({ length: limit }, (_, i) => (
              <span key={i} className={`size-7 grid place-items-center ${i < strikes ? "bg-alarm text-ink" : "bg-bench"}`} style={{ boxShadow: "var(--shadow-px)" }} aria-hidden>
                {i < strikes && <svg width="16" height="16" viewBox="0 0 4 4" shapeRendering="crispEdges"><path d="M0 0h1v1H0zM3 0h1v1H3zM1 1h2v2H1zM0 3h1v1H0zM3 3h1v1H3z" fill="#071312" /></svg>}
              </span>
            ))}
          </span>
        </div>
      </div>

      {frozenMs > 0 && (
        <Link href="/frozen" className="mt-4 block bg-frost text-ink p-4" style={{ boxShadow: "var(--shadow-px)" }}>
          <p className="pf-16">Lab frozen · <span className="font-num">{clock(frozenMs)}</span></p>
          <p className="mt-2 font-num text-[15px]">Too many bad mixes. You can still scan and lend. Tap for details.</p>
        </Link>
      )}

      {(
        <details className="mt-4 panel-dark p-3 group">
          <summary className="cursor-pointer font-num text-[16px] text-text list-none flex items-center justify-between">
            How mixing works <span className="text-fog group-open:rotate-180">v</span>
          </summary>
          <ol className="mt-3 flex flex-col gap-2 font-num text-[15px] leading-[20px] text-fog list-decimal pl-5" style={{ fontWeight: 400 }}>
            <li>Pick a riddle in the <Link href="/hints" className="text-candle underline">Hint Book</Link> and guess its ingredients.</li>
            <li>Tap elements below to add them. Use − and + to set how many.</li>
            <li>If the recipe needs a catalyst, add yours or a friend&apos;s code.</li>
            <li>Tap Synthesize. {limit} wrong guesses in a row freeze your lab.</li>
          </ol>
        </details>
      )}

      <div key={failed ? `f${strikes}` : "ok"} className={`mt-6 ${failed && !running ? "quake" : ""}`}>
        <Rig symbols={Object.keys(recipe)} liquid={rigLiquid} failed={failed && !running} count={total} />
        <p className="mt-3 font-num text-[16px] text-text" aria-live="polite">
          In the flask: {total === 0 ? <span className="text-fog">nothing yet</span> : mixLabel(recipe)}
        </p>
      </div>

      {running ? (
        <div className="mt-6 bg-holo text-ink p-4" style={{ boxShadow: "var(--shadow-px)" }} role="status">
          <p className="pf-24">Running</p>
          <p className="mt-3 flex gap-1" aria-hidden>{[0, 1, 2, 3, 4].map((i) => <i key={i} className="block w-6 h-4 bg-ink blink" style={{ animationDelay: `${i * 200}ms` }} />)}</p>
          <p className="mt-3 font-num text-[15px]">Don&apos;t touch the glass.</p>
        </div>
      ) : result?.ok ? (
        <div role="status" className={`mt-6 p-4 ${result.status === "already_made" ? "panel-parch" : result.status === "frozen" ? "bg-frost text-ink" : "bg-alarm text-ink"}`} style={{ boxShadow: "var(--shadow-px)" }}>
          <p className="pf-24">{result.status === "failed" ? "Nothing." : result.status === "frozen" ? "Cracked." : "Seen it."}</p>
          <p className="mt-2 font-num text-[16px] leading-[22px]">
            {result.status === "failed" && `You mixed ${lastMix}. Nothing has that recipe, so: brown sludge. Check the riddle in the Hint Book. That's ${strikes} of ${limit} bad mixes. ${result.tries_left === 1 ? "One more bad mix and your lab freezes" : `${result.tries_left} more and your lab freezes`} for ${state.settings.freeze_minutes} minutes.`}
            {result.status === "frozen" && `The flask cracked. Your lab is frozen for ${state.settings.freeze_minutes} minutes.`}
            {result.status === "already_made" && `You've already made ${result.name}. Try something new.`}
          </p>
          {result.status === "failed" && <Link href="/hints" className="btn btn-plain mt-4">Hint book</Link>}
        </div>
      ) : null}

      {/* Recipe rows: one per reagent, big − / + (48px targets). */}
      {total > 0 && (
        <ul className="mt-6 flex flex-col gap-4" aria-label="Current mix">
          {Object.entries(recipe).map(([s, q]) => (
            <li key={s} className="panel flex items-center gap-3 p-2">
              <span className="bg-ink text-clinic font-num text-[20px] w-12 h-12 grid place-items-center">{displaySymbol(s)}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-num text-[16px] leading-[20px] truncate">{nameOf(s)}</span>
                <span className="block font-num text-[14px] leading-[18px] text-[#34505a] truncate">{NICK[s] ?? ""}</span>
              </span>
              <button onClick={() => bump(s, -1)} className="btn btn-dark w-12 px-0 text-[24px]" aria-label={`Remove one ${s}`}>-</button>
              <span className="font-num text-[24px] w-8 text-center" aria-label={`${q} ${s}`}>{q}</span>
              <button onClick={() => bump(s, 1)} className="btn btn-dark w-12 px-0 text-[24px]" aria-label={`Add one ${s}`}>+</button>
            </li>
          ))}
        </ul>
      )}

      {/* Reagent picker */}
      <section className="mt-6">
        <h2 className="pf-16 text-fog mb-4">Add {state.ally_elements.length > 0 && <span className="text-holo">· crew commons</span>}</h2>
        {available.length === 0 ? (
          <p className="font-num text-fog">No elements yet. <Link href="/scan" className="underline text-candle">Scan some first.</Link></p>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {available.map((e) => (
              <button key={e.symbol} onClick={() => bump(e.symbol, 1)} aria-label={`Add ${e.name}`}
                className="relative h-14 bg-clinic text-ink flex flex-col items-center justify-center active:translate-y-1"
                style={{ boxShadow: "var(--shadow-px)" }}>
                <span className="font-num text-[20px] leading-none">{displaySymbol(e.symbol)}</span>
                {e.ally && <span className="absolute -bottom-2 bg-holo px-1 text-[11px] font-bold leading-[14px]">ALLY</span>}
                {recipe[e.symbol] && (
                  <span className="absolute -top-3 -right-3 size-6 bg-candle text-ink font-num text-[14px] grid place-items-center" style={{ boxShadow: "var(--shadow-px)" }}>{recipe[e.symbol]}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Catalyst */}
      <section className="mt-8">
        <h2 className="pf-16 text-fog mb-4">Catalyst (optional)</h2>
        <div className="flex gap-3">
          <button onClick={() => setCatalyst(catalyst === "OWN" ? "" : "OWN")} aria-pressed={catalyst === "OWN"}
            className={`btn gap-2 ${catalyst === "OWN" ? "btn-primary" : "btn-plain"}`}>
            <CatalystIcon id={state.player.catalyst.id} scale={3} /> Mine
          </button>
          <input value={catalyst === "OWN" ? "" : catalyst} onChange={(e) => setCatalyst(e.target.value.toUpperCase())}
            placeholder="Friend's code" aria-label="Catalyst code from another player" maxLength={8}
            className="flex-1 min-w-0 h-12 bg-bench text-text px-3 font-num text-[18px] tracking-widest placeholder:text-fog" style={{ boxShadow: "var(--shadow-px)" }} />
        </div>
        <p className="mt-3 font-num text-[14px] leading-[18px] text-fog">A friend&apos;s code works for one attempt. It burns even if the mix fails.</p>
      </section>

      <p className="mt-6 font-num text-[15px] text-fog text-center">{strikes} of {limit} bad mixes. A good mix resets it.</p>
      {/* Sticky above the nav so the main action is never below the fold. */}
      <div className="sticky bottom-[96px] z-20 mt-4 pt-2 bg-[linear-gradient(transparent,var(--color-bg)_30%)]">
        <button onClick={synthesize} disabled={busy || total === 0 || frozenMs > 0}
          className="btn btn-primary w-full h-16 flex-col gap-1">
          <span className="pf-24">{busy ? "Hold still" : "Synthesize"}</span>
          {!busy && total > 0 && <span className="font-num normal-case text-[14px] leading-[16px]">{mixLabel(recipe)}</span>}
        </button>
      </div>
    </div>
  );
}
