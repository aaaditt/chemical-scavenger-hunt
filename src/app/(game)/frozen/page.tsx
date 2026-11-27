"use client";
import Link from "next/link";
import { useGame } from "@/components/GameProvider";
import { Stamp } from "@/components/Hero";
import { useNow } from "@/components/Shell";
import { CatalystIcon, CompoundVessel, Sprite } from "@/components/Sprite";
import { clock, msUntil } from "@/lib/game";

/** Frozen lab (design/screens/frozen.html): everything goes frost; scanning and lending still work. */
export default function FrozenPage() {
  const { state } = useGame();
  const now = useNow();
  if (!state) return null;
  void now;
  const ms = msUntil(state.player.frozen_until);
  const p = state.player;

  if (ms <= 0) {
    return (
      <div className="text-center pt-4">
        <Stamp>Thawed</Stamp>
        <p className="mt-6 panel-parch p-4 font-num text-[16px]">Your lab is back. Mix carefully.</p>
        <Link href="/mix" className="btn btn-primary w-full mt-8">Mix bench</Link>
      </div>
    );
  }

  return (
    <div className="text-center pt-2">
      {/* Icicles: a row of hard pixel teeth. */}
      <div className="flex justify-between -mx-4 -mt-4 mb-4" aria-hidden>
        {Array.from({ length: 12 }, (_, i) => (
          <i key={i} className="block bg-frost" style={{ width: 16, height: 8 + ((i * 7) % 3) * 8 }} />
        ))}
      </div>
      <Stamp tone="frost">Lab frozen</Stamp>
      <div className="mt-8 flex justify-center">
        <div className="p-4 bg-frost/40" style={{ boxShadow: "0 0 0 4px var(--color-frost), 0 0 0 8px var(--color-ink)" }}>
          <CompoundVessel liquid="frozen" scale={8} still />
        </div>
      </div>
      <p className="mt-8 pf-64 text-frost blink" aria-live="off" aria-label={`${clock(ms)} left`}>{clock(ms)}</p>
      <p className="mt-6 font-num text-[16px] leading-[22px] text-text">Too many bad mixes. The bench is locked until it thaws.</p>

      <div className="mt-6 panel-parch p-4 text-left">
        <p className="pf-16">Still allowed</p>
        <ul className="mt-3 font-num text-[16px] leading-[24px]">
          <li>· Scanning QRs (your finds wait on the shelf)</li>
          <li>· Lending your catalyst to friends</li>
          <li>· Reading the hint book and trading tips</li>
        </ul>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <Link href="/scan" className="btn btn-plain">Scan</Link>
        <Link href="/crew" className="btn btn-primary gap-2"><CatalystIcon id={p.catalyst.id} scale={3} /> Lend {p.catalyst.name}</Link>
      </div>
      <div className="mt-6 flex justify-center opacity-80"><Sprite name="flake" scale={4} /></div>
    </div>
  );
}
