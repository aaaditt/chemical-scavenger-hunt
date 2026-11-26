"use client";
import Link from "next/link";
import { Bottle } from "./Bottle";
import type { Tier } from "@/lib/game";
import { errorMessage } from "@/lib/messages";

export type ClaimResponse =
  | { ok: true; status: "new_element"; element: { symbol: string; name: string; tier: Tier; points: number }; points: number; remaining: number | null }
  | { ok: true; status: "duplicate_element"; element: { symbol: string; name: string; tier: Tier } }
  | { ok: true; status: "already_claimed"; element: string | null; compound: string | null }
  | { ok: true; status: "hint_unlocked"; compound: string; riddle: string; locked_hint: string }
  | { ok: false; error: string };

const HEADLINE: Record<Tier, string> = {
  common: "Collected",
  uncommon: "Uncommon find",
  rare: "Rare element secured",
  isotope: "Isotope captured",
};

/** The full-screen moment after a scan. */
export function ClaimResult({ result, onClose }: { result: ClaimResponse; onClose?: () => void }) {
  let body;
  if (!result.ok) {
    body = (
      <>
        <p className="wide text-2xl text-hazard">No luck</p>
        <p className="mt-3 text-label-dim max-w-[28ch] mx-auto">{errorMessage(result.error)}</p>
      </>
    );
  } else if (result.status === "new_element") {
    const e = result.element;
    body = (
      <>
        <div className="animate-pop flex justify-center"><Bottle symbol={e.symbol} name={e.name} tier={e.tier} size={150} /></div>
        <p className="mt-4 wide text-2xl">{HEADLINE[e.tier]}</p>
        <p className="mt-1 wide text-4xl text-amber">+{result.points}</p>
        {result.remaining !== null && <p className="mt-2 text-sm text-label-dim">{result.remaining} left on campus</p>}
      </>
    );
  } else if (result.status === "duplicate_element") {
    const e = result.element;
    body = (
      <>
        <div className="opacity-70 flex justify-center"><Bottle symbol={e.symbol} name={e.name} tier={e.tier} size={120} /></div>
        <p className="mt-4 wide text-xl">Already on your shelf</p>
        <p className="mt-2 text-label-dim">Elements never run out once you have them. Hunt for something new.</p>
      </>
    );
  } else if (result.status === "already_claimed") {
    body = <p className="wide text-xl">You&apos;ve already scanned this code.</p>;
  } else {
    body = (
      <>
        <p className="wide text-2xl text-uranium">Hint unlocked</p>
        <blockquote className="mt-4 rounded-label bg-label text-cobalt-900 p-4 text-left">
          <p className="italic">{result.riddle}</p>
          <p className="mt-3 font-bold">{result.locked_hint}</p>
        </blockquote>
        <p className="mt-3 text-sm text-label-dim">It&apos;s saved in your hint book. Your allies can see it too.</p>
      </>
    );
  }
  return (
    <div className="text-center py-8">
      {body}
      <div className="mt-8 flex gap-3 justify-center">
        {onClose && <button onClick={onClose} className="rounded-label bg-amber text-cobalt-950 font-bold px-6 py-3">Scan another</button>}
        <Link href="/lab" className="rounded-label border border-cobalt-300 px-6 py-3">My lab</Link>
      </div>
    </div>
  );
}
