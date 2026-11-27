import Link from "next/link";
import { Bottle } from "@/components/Bottle";

export default function Home() {
  return (
    <main className="min-h-dvh max-w-md mx-auto px-6 py-10 flex flex-col">
      <h1 className="mt-6">
        <span className="block pf-48 text-text">Secret</span>
        <span className="block pf-48 text-candle mt-2">Catalyst</span>
      </h1>
      <p className="mt-6 font-num text-[18px] leading-[26px] text-fog max-w-[30ch]">
        Elements are hidden in QR codes all over campus. Scan them, mix them into compounds, climb the board.
      </p>

      <div className="mt-10 flex items-end justify-center gap-1" aria-hidden>
        <Bottle symbol="N" name="Nitrogen" tier="common" size={84} />
        <span className="pf-32 text-fog pb-10">+</span>
        <Bottle symbol="H" name="Hydrogen" tier="common" size={84} />
        <span className="pf-32 text-fog pb-10">+</span>
        <Bottle symbol="?" name="Catalyst" tier="rare" size={84} empty />
      </div>

      <p className="mt-8 panel-parch p-4 font-num text-[16px] leading-[22px]">
        The best compounds need a catalyst — heat, pressure, light and more. You were secretly given one. So was
        everyone else. Find who has yours.
      </p>

      <Link href="/lab"
        className="mt-auto btn btn-primary h-16 pf-24">
        Enter the lab
      </Link>
      <Link href="/board" className="mt-4 btn btn-dark">See the leaderboard</Link>
    </main>
  );
}
