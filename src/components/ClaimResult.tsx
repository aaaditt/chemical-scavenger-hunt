"use client";
import Link from "next/link";
import type { Tier } from "@/lib/game";
import { TIER_STYLE, displaySymbol } from "@/lib/game";
import { errorMessage } from "@/lib/messages";
import { NICK } from "@/lib/nicks";
import { LIQ, PIPS } from "@/lib/sprites";
import { Chip, HeroName, HeroStage, Stamp } from "./Hero";
import { Hazard, Pips, Sprite, TierVessel } from "./Sprite";

export type ClaimResponse =
  | { ok: true; status: "new_element"; element: { symbol: string; name: string; tier: Tier; points: number }; points: number; remaining: number | null }
  | { ok: true; status: "duplicate_element"; element: { symbol: string; name: string; tier: Tier } }
  | { ok: true; status: "already_claimed"; element: string | null; compound: string | null }
  | { ok: true; status: "hint_unlocked"; compound: string; riddle: string; locked_hint: string }
  | { ok: false; error: string };

const STAMP: Record<Tier, string> = { common: "Collected", uncommon: "Collected", rare: "Collected", isotope: "Unstable" };
const TIER_TAG: Record<Tier, string> = { common: "Common", uncommon: "Uncommon", rare: "Rare", isotope: "Isotope" };

function ElementHero({ symbol, name, tier, dim = false }: { symbol: string; name: string; tier: Tier; dim?: boolean }) {
  const glow = dim || tier === "common" ? undefined : LIQ[tier].L;
  return (
    <>
      <HeroStage glow={glow}>
        <div className="relative">
          <TierVessel tier={tier} scale={8} />
          <span className="absolute left-1/2 -translate-x-1/2 bg-clinic text-ink font-num text-[28px] leading-none px-2 py-1" style={{ top: 80 }} aria-hidden>
            {displaySymbol(symbol)}
          </span>
        </div>
      </HeroStage>
      <div className="mt-4"><HeroName text={name.replace(/\s*\(.*\)$/, "").replace(/-\d+$/, "")} /></div>
      <p className="mt-2 font-num text-[16px] text-fog">
        {NICK[symbol] ?? TIER_STYLE[tier].label}{tier === "isotope" && /\d+$/.test(name) ? ` · isotope ${name.match(/\d+$/)![0]}` : ""}
      </p>
    </>
  );
}

function TierChip({ tier }: { tier: Tier }) {
  const bg = tier === "isotope" ? "bg-tier-isotope" : tier === "common" ? "bg-tier-common" : "bg-clinic";
  return <Chip className={`${bg} text-ink`}><Pips n={PIPS[tier]} size={8} /><span className="pf-16">{TIER_TAG[tier]}</span></Chip>;
}

/** The full-screen moment after a scan (design/screens/scan-reveal.html). */
export function ClaimResult({ result, onClose }: { result: ClaimResponse; onClose?: () => void }) {
  let body;
  let isotope = false;
  if (!result.ok) {
    body = (
      <>
        <Stamp tone="plain">No luck</Stamp>
        <div className="mt-8 flex justify-center"><Sprite name="smoke" scale={8} /></div>
        <p className="mt-6 panel-parch p-4 text-left font-num text-[16px] leading-[22px]">{errorMessage(result.error)}</p>
      </>
    );
  } else if (result.status === "new_element") {
    const e = result.element;
    isotope = e.tier === "isotope";
    body = (
      <>
        <Stamp tone={isotope ? "iso" : "led"}>{STAMP[e.tier]}</Stamp>
        <div className="mt-6"><ElementHero symbol={e.symbol} name={e.name} tier={e.tier} /></div>
        <div className="mt-4 flex gap-3 justify-center">
          <TierChip tier={e.tier} />
          <Chip className="bg-holo text-ink"><span className="font-num text-[24px]">+{result.points}</span></Chip>
        </div>
        {result.remaining !== null && (
          <div className="mt-6 panel-parch p-4 text-left">
            <p className="pf-16">{isotope ? "Claims left" : "On campus"}</p>
            <p className="mt-2 font-num text-[16px] leading-[22px]">
              {result.remaining === 0 ? "You got the last one." : `${result.remaining} more out there. Whoever has them won't tell you where.`}
            </p>
          </div>
        )}
        {isotope && <p className="mt-4 font-num text-[16px] text-text">Worth more inside a compound. <span className="text-tier-isotope">Someone out there holds the catalyst.</span></p>}
      </>
    );
  } else if (result.status === "duplicate_element") {
    const e = result.element;
    body = (
      <>
        <Stamp tone="plain">Already shelved</Stamp>
        <div className="mt-6"><ElementHero symbol={e.symbol} name={e.name} tier={e.tier} dim /></div>
        <div className="mt-4 flex gap-3 justify-center">
          <TierChip tier={e.tier} />
          <Chip className="bg-bench text-holo"><span className="font-num text-[24px]">+0</span></Chip>
        </div>
        <div className="mt-6 panel-parch p-4 text-left">
          <p className="pf-16">No points for twins</p>
          <p className="mt-2 font-num text-[16px] leading-[22px]">Elements never run out once you have them. Go find something rarer.</p>
        </div>
      </>
    );
  } else if (result.status === "already_claimed") {
    body = (
      <>
        <Stamp tone="plain">Already scanned</Stamp>
        <p className="mt-6 panel-parch p-4 font-num text-[16px]">You&apos;ve already used this code. Each QR works once per lab.</p>
      </>
    );
  } else {
    body = (
      <>
        <Stamp tone="iso">Hint unlocked</Stamp>
        <div className="mt-6 panel-parch p-4 text-left">
          <p className="font-num text-[16px] leading-[22px] italic">{result.riddle}</p>
          <p className="mt-4 font-num text-[18px] leading-[24px]">{result.locked_hint}</p>
        </div>
        <p className="mt-4 font-num text-[16px] text-fog">Saved in your hint book. Your crew can see it too.</p>
      </>
    );
  }
  return (
    <div className="text-center pt-2 pb-6">
      {isotope && <Hazard w={96} h={2} scale={4} className="w-full h-2 mb-4" />}
      {body}
      <div className="mt-8 grid grid-cols-[1fr_1.5fr] gap-4">
        <Link href="/lab" className="btn btn-plain">Shelf</Link>
        {onClose ? <button onClick={onClose} className="btn btn-primary">Keep hunting</button> : <Link href="/scan" className="btn btn-primary">Keep hunting</Link>}
      </div>
    </div>
  );
}
