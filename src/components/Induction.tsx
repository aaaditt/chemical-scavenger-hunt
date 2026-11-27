"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useGame } from "./GameProvider";
import { Burst } from "./Motion";
import { CatalystIcon, CompoundVessel, Lamp, Sprite, TierVessel } from "./Sprite";
import { LIQ } from "@/lib/sprites";

const KEY = "sc-induction-v1";
const OPEN_EVENT = "sc:open-induction";

/** Re-open the tutorial from anywhere (help button, settings). */
export function openInduction() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/** Shows once per device on first entry to the game; replayable via openInduction(). */
export function InductionGate() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage after mount
    try { if (!localStorage.getItem(KEY)) setOpen(true); } catch { /* storage blocked: skip */ }
    const h = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, h);
    return () => window.removeEventListener(OPEN_EVENT, h);
  }, []);
  if (!open) return null;
  return <Induction onDone={() => { try { localStorage.setItem(KEY, "1"); } catch {} setOpen(false); }} />;
}

const STEPS = 5;

function Induction({ onDone }: { onDone: () => void }) {
  const { state } = useGame();
  const router = useRouter();
  const [step, setStep] = useState(0);
  if (!state) return null;
  const p = state.player;
  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1));
  const finish = (to?: string) => { onDone(); if (to) router.push(to); };

  return (
    <div className="fixed inset-0 z-[70] bg-wall overflow-y-auto" role="dialog" aria-modal="true" aria-label="How to play Secret Catalyst">
      <div className="max-w-md mx-auto min-h-full flex flex-col px-5 pt-[max(env(safe-area-inset-top),16px)] pb-8">
        <div className="flex items-center gap-2">
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className={`h-2 flex-1 ${i <= step ? "bg-candle" : "bg-moss"}`} />
          ))}
          <button onClick={() => finish()} className="ml-3 font-num text-[16px] text-fog underline underline-offset-4 h-12 px-2">Skip</button>
        </div>
        <div key={step} className="rise flex-1 flex flex-col">
          {step === 0 && <Welcome lab={p.lab_no} onNext={next} />}
          {step === 1 && <FindElements onNext={next} />}
          {step === 2 && <MixWater onNext={next} />}
          {step === 3 && <YourCatalyst id={p.catalyst.id} name={p.catalyst.name} bonus={state.settings.catalysis_bonus_pct} onNext={next} />}
          {step === 4 && <Rules strikes={state.settings.wrong_streak_limit} freeze={state.settings.freeze_minutes} onGo={() => finish("/scan")} onLab={() => finish()} />}
        </div>
      </div>
    </div>
  );
}

function Step({ scene, title, children, action }: { scene: ReactNode; title: string; children: ReactNode; action: ReactNode }) {
  return (
    <>
      <div className="relative mt-6 h-[320px] panel-dark grid place-items-center overflow-hidden">{scene}</div>
      <h2 className="mt-8 font-num text-[28px] leading-[34px] text-text">{title}</h2>
      <div className="mt-3 font-num font-normal text-[18px] leading-[27px] text-fog flex flex-col gap-3" style={{ fontWeight: 400 }}>{children}</div>
      <div className="mt-auto pt-8">{action}</div>
    </>
  );
}

/* 1 ─ The LED sign flickers on, the lamp lights. */
function Welcome({ lab, onNext }: { lab: string; onNext: () => void }) {
  return (
    <Step
      title="This is your lab."
      scene={
        <div className="flex flex-col items-center gap-8">
          <p className="led led-on px-5 py-3 pf-40">LAB <span className="font-num">{lab}</span></p>
          <div className="flex items-end gap-6">
            <TierVessel tier="common" scale={4} still />
            <div className="led-on" style={{ animationDelay: "500ms" }}><Lamp scale={6} /></div>
            <TierVessel tier="uncommon" scale={4} />
          </div>
        </div>
      }
      action={<button onClick={onNext} className="btn btn-primary w-full h-16 pf-24">How do I play?</button>}
    >
      <p>Secret Catalyst is a chemistry hunt across the whole campus. You don&apos;t need to know any chemistry.</p>
      <p>Your lab number comes from your college ID. Takes 60 seconds to learn.</p>
    </Step>
  );
}

/* 2 ─ Tap the QR on the wall; a bottle drops onto your shelf. */
function FindElements({ onNext }: { onNext: () => void }) {
  const [scanned, setScanned] = useState(false);
  return (
    <Step
      title="Find QR codes hidden around campus."
      scene={
        <div className="relative w-full h-full flex flex-col items-center justify-center gap-6">
          {!scanned ? (
            <button onClick={() => { navigator.vibrate?.(40); setScanned(true); }} className="relative panel-parch p-4 nudge" aria-label="Scan the practice QR code">
              <Sprite name="qr" scale={12} />
              <span className="scanline absolute left-2 right-2 top-3 h-1 bg-alarm" style={{ ["--scan-h" as string]: "104px" }} aria-hidden />
              <span className="block mt-3 font-num text-[16px] text-ink">Tap to scan</span>
            </button>
          ) : (
            <>
              <div className="relative">
                <div className="drop-in"><TierVessel tier="common" scale={8} /></div>
                <span className="absolute left-1/2 -translate-x-1/2 bg-clinic text-ink font-num text-[28px] leading-none px-2 py-1" style={{ top: 80 }}>H</span>
                <Burst />
              </div>
              <p className="slam led px-4 py-2 pf-24">+5 Hydrogen</p>
            </>
          )}
          <div className="absolute bottom-0 inset-x-0 shelf" />
        </div>
      }
      action={<button onClick={onNext} disabled={!scanned} className="btn btn-primary w-full h-16 pf-24">{scanned ? "Next" : "Scan the code above"}</button>}
    >
      <p>Each QR holds an <b className="text-text">element</b>. Scan it with the orange <b className="text-candle">Scan</b> button and it lands on your shelf.</p>
      <p>Common ones are everywhere. Rare ones run out, so be quick.</p>
    </Step>
  );
}

/* 3 ─ Pour H, H, O into the flask: it fills step by step, then WATER. */
function MixWater({ onNext }: { onNext: () => void }) {
  const [added, setAdded] = useState<string[]>([]);
  const h = added.filter((x) => x === "H").length, o = added.filter((x) => x === "O").length;
  const done = h === 2 && o === 1;
  const wrong = h > 2 || o > 1;
  const add = (s: string) => { if (!done) setAdded((a) => (h + o >= 3 && !done ? [s] : [...a, s])); };
  const fill = Math.min(3, added.length);
  return (
    <Step
      title="Mix elements into compounds."
      scene={
        <div className="relative flex flex-col items-center gap-5">
          <div className="relative grid place-items-center" style={{ height: 176 }}>
            {done ? (
              <>
                <CompoundVessel liquid="uncommon" scale={8} />
                <Burst colors={["#3ff0e6", "#dce7ee", "#8df25f"]} />
                <p className="slam absolute -bottom-2 led px-3 py-2 pf-24">Water!</p>
              </>
            ) : (
              <div className="relative">
                <CompoundVessel liquid="empty" scale={8} still />
                {/* Stepped fill: the full flask is revealed from the bottom up, one pour at a time. */}
                <div className="absolute inset-0" style={{ clipPath: `inset(${[100, 75, 62, 48][fill]}% 0 0 0)` }} aria-hidden>
                  <CompoundVessel liquid={wrong ? "sludge" : "uncommon"} scale={8} still />
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-4">
            {(["H", "O"] as const).map((s) => (
              <button key={s} onClick={() => add(s)} disabled={done}
                className="w-20 h-16 bg-clinic text-ink font-num text-[28px] active:translate-y-1" style={{ boxShadow: "var(--shadow-px)" }}
                aria-label={`Add ${s === "H" ? "hydrogen" : "oxygen"}`}>
                {s}
              </button>
            ))}
          </div>
          <p className="font-num text-[16px] text-text" aria-live="polite">
            {done ? "2 × H + 1 × O" : wrong ? "Too much. Tap to start again." : `In the flask: ${added.join(" + ") || "nothing yet"}`}
          </p>
        </div>
      }
      action={<button onClick={onNext} disabled={!done} className="btn btn-primary w-full h-16 pf-24">{done ? "Next" : "Make water: H + H + O"}</button>}
    >
      <p>The <b className="text-text">Hint Book</b> gives you a riddle for every compound. Work out the ingredients, add them on the mix bench, and tap Synthesize.</p>
      <p>Try it: water is two hydrogens and one oxygen.</p>
    </Step>
  );
}

/* 4 ─ The sealed envelope flips open to reveal the player's real catalyst. */
function YourCatalyst({ id, name, bonus, onNext }: { id: string; name: string; bonus: number; onNext: () => void }) {
  const [open, setOpen] = useState(false);
  const color = (LIQ as Record<string, Record<string, string>>)[id]?.L ?? "#ffb547";
  return (
    <Step
      title={open ? `Your secret catalyst: ${name}.` : "You've been given a secret."}
      scene={
        !open ? (
          <button onClick={() => { navigator.vibrate?.([30, 40, 30]); setOpen(true); }} className="nudge flex flex-col items-center gap-4" aria-label="Open the envelope">
            <Sprite name="envelope" scale={12} />
            <span className="font-num text-[16px] text-text">Tap to open. Don&apos;t let anyone see.</span>
          </button>
        ) : (
          <div className="flip-in relative flex flex-col items-center gap-4 bg-clinic text-ink px-10 py-8" style={{ boxShadow: `var(--shadow-px), 0 0 0 12px ${color}` }}>
            <CatalystIcon id={id} scale={10} />
            <p className="pf-40">{name}</p>
            <Burst colors={[color, "#ffffff"]} />
          </div>
        )
      }
      action={<button onClick={onNext} disabled={!open} className="btn btn-primary w-full h-16 pf-24">{open ? "Next" : "Open it"}</button>}
    >
      <p>The best compounds need a catalyst: Heat, Pressure, Light, Electricity, Enzyme or Acid. Everyone holds exactly one.</p>
      <p>Others will need yours. <b className="text-text">Lend it</b> from the Crew tab and earn {bonus}% of their points. You&apos;ll need theirs too, so ask around. Or keep it quiet.</p>
    </Step>
  );
}

/* 5 ─ Three rules, then straight to the scanner. */
function Rules({ strikes, freeze, onGo, onLab }: { strikes: number; freeze: number; onGo: () => void; onLab: () => void }) {
  const rows: { icon: ReactNode; title: string; body: string }[] = [
    { icon: <Sprite name="alarmOn" scale={5} />, title: `${strikes} bad mixes freeze your lab`, body: `Guessing costs you. A frozen lab can't mix for ${freeze} minutes. A good mix resets the count.` },
    { icon: <TierVessel tier="isotope" scale={3} />, title: "Watch for isotope drops", body: "Unstable isotopes appear for a short time only. The big screen and the Insta announce them." },
    { icon: <Sprite name="star" scale={6} />, title: "Be first", body: "The first lab to make a compound gets its name on the big screen. Recipes and catalysts stay secret until the finale." },
  ];
  return (
    <>
      <h2 className="mt-8 font-num text-[28px] leading-[34px] text-text">Three things to know.</h2>
      <ul className="mt-6 flex flex-col gap-4">
        {rows.map((r, i) => (
          <li key={r.title} className="rise panel flex gap-4 p-4 items-start" style={{ animationDelay: `${i * 120}ms` }}>
            <span className="shrink-0 w-14 grid place-items-center pt-1">{r.icon}</span>
            <span>
              <span className="block font-num text-[18px] leading-[24px]">{r.title}</span>
              <span className="block mt-1 font-num text-[16px] leading-[22px]" style={{ fontWeight: 400 }}>{r.body}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-8 flex flex-col gap-4">
        <button onClick={onGo} className="btn btn-primary w-full h-16 pf-24">Find my first QR</button>
        <button onClick={onLab} className="btn btn-dark w-full">Look around my lab first</button>
      </div>
    </>
  );
}
