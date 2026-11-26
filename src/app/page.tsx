import Link from "next/link";
import { Bottle } from "@/components/Bottle";

export default function Home() {
  return (
    <main className="min-h-dvh max-w-md mx-auto px-6 py-10 flex flex-col">
      <h1 className="wide text-[44px] leading-[0.95] mt-6">
        Secret
        <br />
        Catalyst
      </h1>
      <p className="mt-5 text-lg text-label-dim max-w-[30ch]">
        Elements are hidden in QR codes all over campus. Scan them, mix them into compounds, climb the board.
      </p>

      <div className="mt-10 flex items-end justify-center gap-1" aria-hidden>
        <Bottle symbol="N" name="Nitrogen" tier="common" size={84} />
        <span className="wide text-3xl text-label-dim pb-16">+</span>
        <Bottle symbol="H" name="Hydrogen" tier="common" size={84} />
        <span className="wide text-3xl text-label-dim pb-16">+</span>
        <Bottle symbol="?" name="Their catalyst" tier="rare" size={84} empty />
      </div>

      <p className="mt-8 text-label-dim">
        The best compounds need a catalyst — heat, pressure, light and more. You were secretly given one. So was
        everyone else. Find who has yours.
      </p>

      <Link href="/lab"
        className="mt-auto block text-center rounded-label bg-amber text-cobalt-950 font-bold text-lg py-4 shadow-[0_6px_0_var(--color-amber-deep)] active:translate-y-1 active:shadow-[0_2px_0_var(--color-amber-deep)] transition">
        Enter the lab
      </Link>
      <Link href="/board" className="mt-4 text-center text-label-dim underline">See the leaderboard</Link>
    </main>
  );
}
