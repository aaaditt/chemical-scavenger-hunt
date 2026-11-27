"use client";
import { useCallback, useEffect, useState } from "react";
import { useGame } from "./GameProvider";
import { displaySymbol } from "@/lib/game";
import { errorMessage } from "@/lib/messages";
import { rpc, supabase } from "@/lib/supabase";

type Detail = {
  player: { id: string; display_name: string; email: string; catalyst: string; score: number; compounds_count: number; verified: boolean; is_test: boolean; is_admin: boolean; disqualified: boolean; frozen_until: string | null };
  elements: { symbol: string; source: string }[];
  compounds: { id: string; name: string; formula: string; points: number }[];
  hints: string[];
  ledger: { delta: number; reason: string; ref: string | null; created_at: string }[];
  attempts: { recipe: Record<string, number>; catalyst: string | null; success: boolean; compound: string | null; created_at: string }[];
  alliance: string | null;
};
type Cmp = { id: string; name: string; formula: string; tier: string; locked_hint: string | null };
type El = { symbol: string; name: string; tier: string };
const CATALYSTS = ["heat", "pressure", "light", "electricity", "enzyme", "acid"];

/** Organizer side panel: inspect one player and grant/revoke anything. */
export function PlayerManager({ playerId, onClose, onChanged }: { playerId: string; onClose: () => void; onChanged: () => void }) {
  const { toast } = useGame();
  const [d, setD] = useState<Detail | null>(null);
  const [els, setEls] = useState<El[]>([]);
  const [cmps, setCmps] = useState<Cmp[]>([]);
  const [pick, setPick] = useState({ element: "", compound: "", hint: "", points: "" });
  const [rand, setRand] = useState({ elements: 5, compounds: 2, hints: 2, rare: false });

  const load = useCallback(async () => {
    const r = await rpc<{ data: Detail }>("admin_player_detail", { p_player: playerId });
    if (r.ok) setD((r as unknown as { data: Detail }).data);
  }, [playerId]);
  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect -- async fetch; setState runs after await
    supabase().from("elements").select("symbol,name,tier").order("points").then(({ data }) => setEls((data as El[]) ?? []));
    rpc<{ data: Cmp[] }>("admin_compounds").then((r) => r.ok && setCmps((r as unknown as { data: Cmp[] }).data));
  }, [load]);

  async function act(fn: string, args: Record<string, unknown>, ok: string) {
    const r = await rpc(fn, { p_player: playerId, ...args });
    toast(r.ok ? ok : errorMessage(r.error), r.ok ? "good" : "bad");
    await load();
    onChanged();
  }

  const owned = new Set(d?.elements.map((e) => e.symbol));
  const made = new Set(d?.compounds.map((c) => c.id));
  const hinted = new Set(d?.hints);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50" onClick={onClose}>
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-cobalt-900 p-6 space-y-6" onClick={(e) => e.stopPropagation()} aria-label="Manage player">
        {!d ? <p>Loading…</p> : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="wide text-xl">{d.player.display_name}</h2>
                <p className="text-sm text-label-dim">{d.player.is_test ? "username test account" : d.player.email}{d.alliance && ` · alliance "${d.alliance}"`}</p>
                <p className="text-sm mt-1"><b className="wide text-lg">{d.player.score}</b> pts · {d.player.compounds_count} compounds · {d.elements.length} elements</p>
              </div>
              <button onClick={onClose} className="text-2xl leading-none" aria-label="Close">×</button>
            </div>

            <section className="space-y-2">
              <h3 className="font-semibold">Give random stuff</h3>
              <div className="flex flex-wrap items-end gap-2 text-sm">
                {(["elements", "compounds", "hints"] as const).map((k) => (
                  <label key={k} className="capitalize">{k}<input type="number" min={0} value={rand[k]} onChange={(e) => setRand({ ...rand, [k]: +e.target.value })} className="block w-16 mt-1 rounded-label bg-cobalt-800 p-1.5" /></label>
                ))}
                <label className="flex items-center gap-1"><input type="checkbox" checked={rand.rare} onChange={(e) => setRand({ ...rand, rare: e.target.checked })} />rare too</label>
                <button onClick={() => act("admin_give_random", { p_elements: rand.elements, p_compounds: rand.compounds, p_hints: rand.hints, p_include_rare: rand.rare }, "Random loadout given")}
                  className="rounded-label bg-amber text-cobalt-950 font-bold px-3 py-1.5">Give</button>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold">Elements</h3>
              <div className="flex flex-wrap gap-1.5">
                {els.map((e) => (
                  <button key={e.symbol} title={`${e.name} (${e.tier}) — click to ${owned.has(e.symbol) ? "remove" : "give"}`}
                    onClick={() => act(owned.has(e.symbol) ? "admin_revoke_element" : "admin_grant_element", { p_element: e.symbol }, owned.has(e.symbol) ? `Removed ${e.symbol}` : `Gave ${e.symbol}`)}
                    className={`min-w-10 rounded-label px-2 py-1 wide text-sm ${owned.has(e.symbol) ? "bg-label text-cobalt-900" : "border border-cobalt-600 text-label-dim"}`}>
                    {displaySymbol(e.symbol)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-label-dim">Filled = owned. Click to give or remove.</p>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold">Compounds ({d.compounds.length})</h3>
              <div className="flex gap-2">
                <select value={pick.compound} onChange={(e) => setPick({ ...pick, compound: e.target.value })} className="flex-1 rounded-label bg-cobalt-800 p-2 text-sm" aria-label="Compound">
                  <option value="">Choose a compound…</option>
                  {cmps.filter((c) => !made.has(c.id)).map((c) => <option key={c.id} value={c.id}>{c.name} {c.formula} ({c.tier})</option>)}
                </select>
                <button disabled={!pick.compound} onClick={() => act("admin_grant_compound", { p_compound: pick.compound }, "Compound given")} className="rounded-label bg-label text-cobalt-900 font-bold px-3 disabled:opacity-40">Give</button>
              </div>
              <ul className="text-sm space-y-1">
                {d.compounds.map((c) => (
                  <li key={c.id} className="flex justify-between"><span>{c.name} {c.formula} · {c.points}</span>
                    <button onClick={() => act("admin_revoke_compound", { p_compound: c.id }, "Removed")} className="text-hazard underline">remove</button></li>
                ))}
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold">Locked hints ({d.hints.length})</h3>
              <div className="flex gap-2">
                <select value={pick.hint} onChange={(e) => setPick({ ...pick, hint: e.target.value })} className="flex-1 rounded-label bg-cobalt-800 p-2 text-sm" aria-label="Hint">
                  <option value="">Choose a hint to unlock…</option>
                  {cmps.filter((c) => c.locked_hint && !hinted.has(c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button disabled={!pick.hint} onClick={() => act("admin_unlock_hint", { p_compound: pick.hint }, "Hint unlocked")} className="rounded-label bg-label text-cobalt-900 font-bold px-3 disabled:opacity-40">Unlock</button>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3 text-sm">
              <label>Secret catalyst
                <select value={d.player.catalyst} onChange={(e) => act("admin_set_catalyst", { p_catalyst: e.target.value }, "Catalyst changed")} className="block w-full mt-1 rounded-label bg-cobalt-800 p-2">
                  {CATALYSTS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label>Adjust points
                <span className="flex gap-1 mt-1">
                  <input value={pick.points} onChange={(e) => setPick({ ...pick, points: e.target.value })} placeholder="+50 / -20" className="w-full rounded-label bg-cobalt-800 p-2" />
                  <button onClick={() => { if (Number(pick.points)) void act("admin_adjust", { p_delta: Number(pick.points), p_reason: "manual" }, "Adjusted"); }} className="rounded-label bg-label text-cobalt-900 font-bold px-3">Apply</button>
                </span>
              </label>
            </section>

            <section className="flex flex-wrap gap-2 text-sm">
              <button onClick={() => act("admin_verify", { p_verified: !d.player.verified }, d.player.verified ? "Unverified" : "Verified")} className="rounded-label border border-cobalt-300 px-3 py-1.5">{d.player.verified ? "Unverify" : "Verify"}</button>
              <button onClick={() => act("admin_freeze", { p_minutes: 15 }, "Frozen 15 min")} className="rounded-label border border-ice text-ice px-3 py-1.5">Freeze 15m</button>
              <button onClick={() => act("admin_freeze", { p_minutes: 0 }, "Unfrozen")} className="rounded-label border border-ice text-ice px-3 py-1.5">Unfreeze</button>
              <button onClick={() => act("admin_disqualify", { p_dq: !d.player.disqualified }, d.player.disqualified ? "Reinstated" : "Disqualified")} className="rounded-label border border-hazard text-hazard px-3 py-1.5">{d.player.disqualified ? "Reinstate" : "Disqualify"}</button>
              <button onClick={() => { if (confirm("Wipe all this player's progress?")) void act("admin_reset_player", {}, "Progress wiped"); }} className="rounded-label border border-hazard text-hazard px-3 py-1.5">Reset progress</button>
              <button onClick={async () => { if (confirm(`Delete ${d.player.display_name}'s account entirely?`)) { await act("admin_delete_player", {}, "Deleted"); onClose(); } }} className="rounded-label bg-hazard px-3 py-1.5 font-bold">Delete account</button>
            </section>

            <section>
              <h3 className="font-semibold">Recent mixes</h3>
              <ul className="text-xs text-label-dim mt-1 space-y-0.5">
                {d.attempts.map((a, i) => <li key={i}>{a.success ? "✓" : "✗"} {Object.entries(a.recipe).map(([k, v]) => `${k}${v > 1 ? v : ""}`).join(" ")}{a.catalyst ? ` + ${a.catalyst}` : ""} {a.compound ?? ""}</li>)}
              </ul>
              <h3 className="font-semibold mt-4">Score history</h3>
              <ul className="text-xs text-label-dim mt-1 space-y-0.5">
                {d.ledger.map((l, i) => <li key={i}>{l.delta > 0 ? "+" : ""}{l.delta} · {l.reason} {l.ref ?? ""} · {new Date(l.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}</li>)}
              </ul>
            </section>
          </>
        )}
      </aside>
    </div>
  );
}
