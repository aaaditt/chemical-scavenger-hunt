"use client";
import Link from "next/link";
import { useState } from "react";
import { useGame } from "@/components/GameProvider";
import { useNow } from "@/components/Shell";
import { clock, msUntil } from "@/lib/game";
import { errorMessage } from "@/lib/messages";
import { rpc } from "@/lib/supabase";

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
        <p className="text-7xl" aria-hidden>{win ? (result.outcome === "safe" ? "💼" : "💰") : "🥶"}</p>
        <p className="wide text-3xl mt-4">{win ? `+${result.points}` : "Frozen"}</p>
        <p className="mt-2 text-label-dim">
          {result.outcome === "safe" && "You took the sure thing."}
          {result.outcome === "small" && "The dealer pays out."}
          {result.outcome === "big" && "Jackpot. The dealer is not happy."}
          {result.outcome === "frozen" && `Bad deal. Your lab is frozen for ${s.market_freeze_minutes} minutes.`}
        </p>
        <Link href="/lab" className="mt-8 inline-block rounded-label bg-amber text-cobalt-950 font-bold px-6 py-3">Back to the lab</Link>
      </div>
    );
  }

  return (
    <div className="-mx-4 -mt-3 px-5 py-8 min-h-[70dvh] bg-black">
      <p className="text-amber text-sm">🕶️ Black market</p>
      <h1 className="wide text-3xl mt-2">One deal. No refunds.</h1>
      {!ev ? (
        <p className="mt-6 text-label-dim">The market is closed. It opens without warning — watch the Insta and the live feed.</p>
      ) : ev.played ? (
        <p className="mt-6 text-label-dim">You&apos;ve made your deal for this window.</p>
      ) : (
        <>
          <p className="mt-2 text-label-dim">Closes in <span className="wide tabular-nums text-label">{clock(msUntil(ev.ends_at))}</span></p>
          <div className="mt-8 space-y-4">
            <button disabled={busy} onClick={() => play("safe")} className="w-full text-left rounded-label border-2 border-label p-5 disabled:opacity-50">
              <p className="wide text-xl">Take the case</p>
              <p className="mt-1 text-label-dim">+{s.market_safe_points} points. Guaranteed.</p>
            </button>
            <button disabled={busy} onClick={() => play("gamble")} className="w-full text-left rounded-label border-2 border-amber p-5 disabled:opacity-50">
              <p className="wide text-xl text-amber">{busy ? "Shuffling…" : "Roll the dice"}</p>
              <p className="mt-1 text-label-dim">+{s.market_small_points} or +{s.market_big_points}… or your lab freezes for {s.market_freeze_minutes} minutes.</p>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
