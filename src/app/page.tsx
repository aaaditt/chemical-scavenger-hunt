import Link from "next/link";
import { CatalystIcon, CompoundVessel, Lamp, Sprite, TierVessel } from "@/components/Sprite";

const STEPS = [
  { title: "Scan", body: "QR codes are hidden on walls, doors and noticeboards. Each one gives you an element.", icon: <Sprite name="qr" scale={4} /> },
  { title: "Mix", body: "Solve a riddle, combine the right elements and make a compound. Rarer compounds score more.", icon: <TierVessel tier="uncommon" scale={2} /> },
  { title: "Find your catalyst", body: "You secretly hold one of six catalysts. The best recipes need someone else's. Trade, team up, or betray.", icon: <CatalystIcon mystery scale={3} /> },
];

export default function Home() {
  return (
    <main className="min-h-dvh max-w-md mx-auto px-5 pt-10 pb-10 flex flex-col">
      <h1>
        <span className="block pf-48 text-text">Secret</span>
        <span className="block pf-48 text-candle mt-2">Catalyst</span>
      </h1>
      <p className="mt-4 font-num text-[18px] leading-[26px] text-fog" style={{ fontWeight: 400 }}>
        A chemistry hunt across BITS Dubai. No chemistry knowledge needed.
      </p>

      {/* The one orchestrated moment: a QR is scanned, a bottle drops, the flask over the lamp starts bubbling. */}
      <div className="relative mt-8 h-[220px] panel-dark overflow-hidden" aria-hidden>
        <div className="absolute left-5 top-6 panel-parch p-2">
          <Sprite name="qr" scale={7} />
          <span className="scanline absolute left-1 right-1 top-2 h-1 bg-alarm" style={{ ["--scan-h" as string]: "56px" }} />
        </div>
        <div className="absolute left-[132px] top-[88px] drop-in" style={{ animationDelay: "700ms" }}><TierVessel tier="common" scale={4} still /></div>
        <div className="absolute left-[196px] top-[88px] drop-in" style={{ animationDelay: "1000ms" }}><TierVessel tier="rare" scale={4} /></div>
        <div className="absolute right-5 bottom-3 flex flex-col items-center">
          <CompoundVessel liquid="pressure" scale={4} />
          <Lamp scale={3} />
        </div>
        <div className="absolute inset-x-0 bottom-0 shelf" />
      </div>

      <ol className="mt-8 flex flex-col gap-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="panel flex gap-4 p-4 items-start">
            <span className="shrink-0 flex flex-col items-center gap-2 w-12">
              <span className="font-num text-[14px] bg-ink text-clinic w-7 h-7 grid place-items-center">{i + 1}</span>
              {s.icon}
            </span>
            <span>
              <span className="block font-num text-[20px] leading-[24px]">{s.title}</span>
              <span className="block mt-1 font-num text-[16px] leading-[22px]" style={{ fontWeight: 400 }}>{s.body}</span>
            </span>
          </li>
        ))}
      </ol>

      <Link href="/lab" className="mt-8 btn btn-primary h-16 pf-24">Enter the lab</Link>
      <p className="mt-3 text-center font-num text-[15px] text-fog" style={{ fontWeight: 400 }}>Sign in with your BITS Dubai Google account.</p>
      <Link href="/board" className="mt-6 btn btn-dark">See who&apos;s winning</Link>
    </main>
  );
}
