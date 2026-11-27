"use client";
import Link from "next/link";
import { useState } from "react";
import { useGame } from "@/components/GameProvider";
import { useShift } from "@/components/Shell";
import { Sprite } from "@/components/Sprite";
import { errorMessage } from "@/lib/messages";
import { rpc, supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const { state, refresh, toast } = useGame();
  const [name, setName] = useState(state?.player.display_name ?? "");
  const [busy, setBusy] = useState(false);
  const [shift, toggleShift] = useShift();
  if (!state) return null;
  const p = state.player;

  async function setPublic(v: boolean) {
    setBusy(true);
    const r = await rpc("set_name_public", { p_public: v });
    setBusy(false);
    toast(r.ok ? (v ? "Your name is back on the big screen" : `You'll show as Lab ${p.lab_no}`) : errorMessage(r.error), r.ok ? "good" : "bad");
    void refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="led self-start px-3 py-2 pf-24">LAB <span className="font-num">{p.lab_no}</span></h1>
      <p className="font-num text-[15px] leading-[20px] text-fog -mt-4">Your lab number comes from your college ID.</p>

      <section className="panel p-4">
        <h2 className="pf-16">Display name</h2>
        <form className="mt-4 flex gap-3" onSubmit={async (e) => {
          e.preventDefault();
          const r = await rpc("set_display_name", { p_name: name });
          toast(r.ok ? "Name saved" : errorMessage(r.error), r.ok ? "good" : "bad");
          void refresh();
        }}>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} aria-label="Display name"
            className="flex-1 min-w-0 h-12 bg-white text-ink px-3 font-num text-[18px]" style={{ boxShadow: "var(--shadow-px)" }} />
          <button className="btn btn-primary">Save</button>
        </form>
      </section>

      {/* Organizer decision: names are public unless the player opts out. */}
      <section className="panel p-4">
        <h2 className="pf-16">Big screen &amp; story cards</h2>
        <p className="mt-3 font-num text-[16px] leading-[22px]">
          Right now you show up as <b>{p.name_public ? p.display_name : `Lab ${p.lab_no}`}</b> on the projector, the live feed, the leaderboard and your share cards.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Public name">
          <button role="radio" aria-checked={p.name_public} disabled={busy} onClick={() => !p.name_public && setPublic(true)}
            className={`btn ${p.name_public ? "btn-primary" : "btn-plain"}`}>Show name</button>
          <button role="radio" aria-checked={!p.name_public} disabled={busy} onClick={() => p.name_public && setPublic(false)}
            className={`btn ${!p.name_public ? "btn-primary" : "btn-plain"}`}>Lab {p.lab_no}</button>
        </div>
      </section>

      <section className="panel p-4 flex items-center gap-4">
        <Sprite name={shift === "day" ? "sun" : "moon"} scale={4} />
        <div className="flex-1">
          <h2 className="pf-16">{shift === "day" ? "Day shift" : "Night shift"}</h2>
          <p className="mt-2 font-num text-[15px] leading-[20px]">Day shift is brighter, for reading in full sun.</p>
        </div>
        <button onClick={toggleShift} className="btn btn-plain">{shift === "day" ? "Night" : "Day"}</button>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <Link href="/recap" className="btn btn-plain">Lab recap</Link>
        <button onClick={() => supabase().auth.signOut()} className="btn btn-dark">Sign out</button>
      </div>
    </div>
  );
}
