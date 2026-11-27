"use client";
import Link from "next/link";
import { useState } from "react";
import { useGame } from "@/components/GameProvider";
import { useNow } from "@/components/Shell";
import { clock, msUntil } from "@/lib/game";
import { errorMessage } from "@/lib/messages";
import { rpc } from "@/lib/supabase";
import { Hazard, Sprite } from "@/components/Sprite";

type Outcome = { outcome: "safe" | "small" | "big" | "frozen"; points: number };

export default function MarketPage() {
  const { state, refresh, toast } = useGame();
  const now = useNow();
  const [result, setResult] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);
  if (!state) return null;
  const s = state.settings;
  const ev = state.events.find((e) => e.kind === "black_market");
  void now;

  async function play(choice: "safe" | "gamble") {
    setBusy(true);
    // A beat of suspense before the reveal.
    const [r] = await Promise.all([rpc<Outcome>("market_play", { p_choice: choice }), new Promise((res) => setTimeout(res, choice === "gamble" ? 1600 : 300))]);
    setBusy(false);
    if (!r.ok) toast(errorMessage(r.error), "bad");
    else setResult(r as unknown as Outcome);
    void refresh();
  }

  if (result) {
    const win = result.outcome !== "frozen";
    return (
      <div className="text-center py-12 animate-pop">
        <div className="flex justify-center" aria-hidden><Sprite name={win ? "star" : "flake"} scale={12} /></div>
        <p className="pf-48 mt-6">{win ? `+${result.points}` : "Frozen"}</p>
        <p className="mt-4 font-num text-[18px] text-fog">
          {result.outcome === "safe" && "You took the sure thing."}
          {result.outcome === "small" && "The dealer pays out."}
          {result.outcome === "big" && "Jackpot. The dealer is not happy."}
          {result.outcome === "frozen" && `Bad deal. Your lab is frozen for ${s.market_freeze_minutes} minutes.`}
        </p>
        <Link href="/lab" className="mt-8 inline-block btn btn-primary">Back to the lab</Link>
      </div>
    );
  }

  return (
    <div className="-mx-4 -mt-4 min-h-[70dvh] bg-ink"><Hazard w={98} h={4} scale={4} className="w-full h-4" /><div className="px-5 py-8">
      <p className="pf-16 text-hazard">Black market</p>
      <h1 className="pf-32 mt-4 text-text">One deal. No refunds.</h1>
      {!ev ? (
        <p className="mt-6 text-fog">The market is closed. It opens without warning — watch the Insta and the live feed.</p>
      ) : ev.played ? (
        <p className="mt-6 text-fog">You&apos;ve made your deal for this window.</p>
      ) : (
        <>
          <p className="mt-2 text-fog">Closes in <span className="font-num text-text">{clock(msUntil(ev.ends_at))}</span></p>
          <div className="mt-8 space-y-4">
            <button disabled={busy} onClick={() => play("safe")} className="w-full text-left bg-clinic text-ink p-5 disabled:opacity-50" style={{ boxShadow: "var(--shadow-px)" }}>
              <p className="pf-24">Take the case</p>
              <p className="mt-2 font-num text-[16px]">+{s.market_safe_points} points. Guaranteed.</p>
            </button>
            <button disabled={busy} onClick={() => play("gamble")} className="w-full text-left bg-hazard text-ink p-5 disabled:opacity-50" style={{ boxShadow: "var(--shadow-px)" }}>
              <p className="pf-24">{busy ? "Shuffling…" : "Roll the dice"}</p>
              <p className="mt-2 font-num text-[16px]">+{s.market_small_points} or +{s.market_big_points}… or your lab freezes for {s.market_freeze_minutes} minutes.</p>
            </button>
          </div>
        </>
      )}
    </div></div>
  );
}
