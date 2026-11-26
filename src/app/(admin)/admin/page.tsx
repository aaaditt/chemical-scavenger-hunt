"use client";
import { useCallback, useEffect, useState } from "react";
import { useGame } from "@/components/GameProvider";
import { FEED_ICON, useFeed } from "@/components/Leaderboard";
import { useNow } from "@/components/Shell";
import { PlayerManager } from "@/components/PlayerManager";
import { clock, msUntil } from "@/lib/game";
import { errorMessage } from "@/lib/messages";
import { rpc } from "@/lib/supabase";

type Settings = Record<string, number | boolean | string | null>;
type Overview = {
  settings: Settings;
  players: number; active_10m: number; frozen: number; claims: number; syntheses: number;
  discovered: number; compounds_total: number; alliances: number;
  catalysts: Record<string, number>;
  events: { id: string; kind: string; label: string; ends_at: string }[];
  flags: { id: string; display_name: string; email: string; reason: string; n: number }[];
};
type PlayerRow = { id: string; email: string; student_id: string | null; display_name: string; catalyst: string; score: number;
  compounds_count: number; niche_points: number; lends_count: number; frozen_until: string | null; disqualified: boolean; is_admin: boolean; elements: number; verified: boolean; is_test: boolean; alliance: string | null };
type QrRow = { id: string; code: string; element: string | null; element_name: string | null; tier: string | null; cap: number | null; claimed_count: number; location_label: string; active_until: string | null };

const NUM_SETTINGS: { key: string; label: string }[] = [
  { key: "freeze_minutes", label: "Freeze after failed mixes (min)" },
  { key: "wrong_streak_limit", label: "Wrong mixes before freeze" },
  { key: "catalysis_bonus_pct", label: "Catalyst lender bonus (%)" },
  { key: "catalyst_code_minutes", label: "Catalyst code lifetime (min)" },
  { key: "gift_links_per_player", label: "Gift links per player" },
  { key: "alliance_max", label: "Alliance max size" },
  { key: "alliance_leave_penalty", label: "Betrayal penalty (pts)" },
  { key: "market_safe_points", label: "Market safe (pts)" },
  { key: "market_small_points", label: "Market small win (pts)" },
  { key: "market_big_points", label: "Market big win (pts)" },
  { key: "market_p_small", label: "P(small win) 0–1" },
  { key: "market_p_big", label: "P(big win) 0–1" },
  { key: "market_freeze_minutes", label: "Market freeze (min)" },
  { key: "scan_cooldown_seconds", label: "Scan cooldown (s)" },
];

export default function ControlRoom() {
  const { toast } = useGame();
  const now = useNow();
  const [ov, setOv] = useState<Overview | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [isotopes, setIsotopes] = useState<QrRow[]>([]);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Settings>({});
  const [caption, setCaption] = useState<{ text: string; image: string } | null>(null);
  const [drop, setDrop] = useState({ qr: "", minutes: 30, hint: "" });
  const [marketMin, setMarketMin] = useState(10);
  const feed = useFeed(25);
  const [managing, setManaging] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [o, p, qr] = await Promise.all([
      rpc<{ data: Overview }>("admin_overview"),
      rpc<{ data: PlayerRow[] }>("admin_players", { p_search: q, p_limit: 200 }),
      rpc<{ data: QrRow[] }>("admin_list_qr"),
    ]);
    if (o.ok) setOv((o as unknown as { data: Overview }).data);
    if (p.ok) setPlayers((p as unknown as { data: PlayerRow[] }).data);
    if (qr.ok) setIsotopes((qr as unknown as { data: QrRow[] }).data.filter((x) => x.tier === "isotope"));
  }, [q]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch; setState runs after await
    void load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [load]);

  async function act(fn: string, args: Record<string, unknown>, okMsg: string) {
    const r = await rpc(fn, args);
    toast(r.ok ? okMsg : errorMessage(r.error), r.ok ? "good" : "bad");
    void load();
    return r;
  }

  if (!ov) return <p className="text-label-dim">Loading…</p>;
  const s = ov.settings;
  void now;
  const site = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-8">
      <div className="space-y-10">
        {/* Game state */}
        <section className="flex flex-wrap items-center gap-4">
          <button onClick={() => act("admin_update_settings", { p: { game_open: !s.game_open } }, s.game_open ? "Game closed" : "Game opened")}
            className={`rounded-label px-6 py-4 wide text-xl ${s.game_open ? "bg-hazard" : "bg-uranium text-cobalt-950"}`}>
            {s.game_open ? "Close the lab" : "Open the lab"}
          </button>
          <p className="text-label-dim">The lab is <b className="text-label">{s.game_open ? "OPEN" : "CLOSED"}</b>. Players can only scan and mix while it&apos;s open.</p>
          <label className="ml-auto flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!s.finale_revealed}
              onChange={(e) => act("admin_update_settings", { p: { finale_revealed: e.target.checked } }, e.target.checked ? "Finale unlocked" : "Finale hidden")} />
            Reveal catalysts on finale screen
          </label>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ["Players", ov.players], ["Active (10 min)", ov.active_10m], ["Frozen now", ov.frozen], ["Scans", ov.claims],
            ["Syntheses", ov.syntheses], ["Discovered", `${ov.discovered}/${ov.compounds_total}`], ["Alliances", ov.alliances],
            ["Catalysts", Object.entries(ov.catalysts).map(([k, v]) => `${k.slice(0, 4)} ${v}`).join(" · ")],
          ].map(([k, v]) => (
            <div key={String(k)} className="rounded-label bg-cobalt-900 p-4">
              <p className="text-xs text-label-dim">{k}</p>
              <p className={`${typeof v === "number" ? "wide text-3xl" : "text-sm mt-1"} tabular-nums`}>{v}</p>
            </div>
          ))}
        </section>

        {/* Events */}
        <section className="grid md:grid-cols-2 gap-4">
          <div className="rounded-label border border-uranium p-5">
            <h2 className="wide text-lg text-uranium">☢️ Isotope drop</h2>
            <p className="text-sm text-label-dim mt-1">Wakes a dormant isotope QR for a limited time. Create isotope QRs on the QR page first and hide them.</p>
            <select value={drop.qr} onChange={(e) => setDrop({ ...drop, qr: e.target.value })} className="mt-3 w-full rounded-label bg-cobalt-900 p-2" aria-label="Isotope QR">
              <option value="">Choose an isotope QR…</option>
              {isotopes.map((i) => (
                <option key={i.id} value={i.id}>{i.element_name} · {i.location_label || "no location"} · cap {i.cap ?? "∞"} · {i.claimed_count} claimed{i.active_until && msUntil(i.active_until) > 0 ? " · LIVE" : ""}</option>
              ))}
            </select>
            <div className="mt-2 flex gap-2">
              <input type="number" value={drop.minutes} onChange={(e) => setDrop({ ...drop, minutes: +e.target.value })} className="w-20 rounded-label bg-cobalt-900 p-2" aria-label="Minutes" />
              <input value={drop.hint} onChange={(e) => setDrop({ ...drop, hint: e.target.value })} placeholder="Location hint (shown to players)" className="flex-1 rounded-label bg-cobalt-900 p-2" />
            </div>
            <button disabled={!drop.qr} className="mt-3 w-full rounded-label bg-uranium text-cobalt-950 font-bold py-3 disabled:opacity-40"
              onClick={async () => {
                const r = await act("admin_drop_isotope", { p_qr: drop.qr, p_minutes: drop.minutes, p_hint: drop.hint }, "Isotope released");
                if (r.ok) {
                  const el = String((r as Record<string, unknown>).element);
                  setCaption({
                    text: `☢️ UNSTABLE ISOTOPE DETECTED ☢️\n${el} is loose on campus for the next ${drop.minutes} minutes.${drop.hint ? `\nLast seen: ${drop.hint}` : ""}\nOnly ${(r as Record<string, unknown>).cap ?? "a few"} samples exist. Go.\n#SecretCatalyst`,
                    image: `${site}/api/card/drop?kind=isotope&title=${encodeURIComponent(el)}&minutes=${drop.minutes}&hint=${encodeURIComponent(drop.hint)}`,
                  });
                }
              }}>Release isotope</button>
          </div>

          <div className="rounded-label border border-amber p-5">
            <h2 className="wide text-lg text-amber">🕶️ Black market</h2>
            <p className="text-sm text-label-dim mt-1">Every player gets one deal per window: safe +{String(s.market_safe_points)} or gamble.</p>
            <div className="mt-3 flex gap-2 items-center">
              <input type="number" value={marketMin} onChange={(e) => setMarketMin(+e.target.value)} className="w-20 rounded-label bg-cobalt-900 p-2" aria-label="Minutes" />
              <span className="text-sm">minutes</span>
            </div>
            <button className="mt-3 w-full rounded-label bg-amber text-cobalt-950 font-bold py-3"
              onClick={async () => {
                const r = await act("admin_open_market", { p_minutes: marketMin }, "Black market open");
                if (r.ok) setCaption({
                  text: `🕶️ The BLACK MARKET is open.\n${marketMin} minutes. One deal each.\nTake the safe +${s.market_safe_points}… or gamble for +${s.market_big_points}. Or lose your lab for an hour.\n#SecretCatalyst`,
                  image: `${site}/api/card/drop?kind=market&title=Black%20Market&minutes=${marketMin}`,
                });
              }}>Open the market</button>
          </div>
        </section>

        {caption && (
          <section className="rounded-label bg-label text-cobalt-900 p-5">
            <div className="flex justify-between items-start">
              <h2 className="wide">Instagram story kit</h2>
              <button onClick={() => setCaption(null)} className="text-sm underline">Dismiss</button>
            </div>
            <pre className="mt-3 whitespace-pre-wrap font-sans">{caption.text}</pre>
            <div className="mt-3 flex gap-3">
              <button onClick={() => { void navigator.clipboard.writeText(caption.text); toast("Caption copied", "good"); }} className="rounded-label bg-cobalt-800 text-label px-4 py-2">Copy caption</button>
              <a href={caption.image} target="_blank" className="rounded-label border border-cobalt-800 px-4 py-2">Open story image</a>
            </div>
          </section>
        )}

        {ov.events.some((e) => msUntil(e.ends_at) > 0) && (
          <section>
            <h2 className="wide text-lg">Live events</h2>
            <ul className="mt-2 space-y-2">
              {ov.events.filter((e) => msUntil(e.ends_at) > 0).map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-label bg-cobalt-900 p-3">
                  <span>{e.kind === "isotope_drop" ? "☢️" : "🕶️"} {e.label}</span>
                  <span className="wide tabular-nums ml-auto">{clock(msUntil(e.ends_at))}</span>
                  <button onClick={() => act("admin_end_event", { p_event: e.id }, "Event ended")} className="text-sm text-hazard underline">End now</button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Flags */}
        {ov.flags.length > 0 && (
          <section>
            <h2 className="wide text-lg text-hazard">Flags</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {ov.flags.map((f) => (
                <li key={f.id + f.reason}>{f.display_name} ({f.email}) — {f.reason === "burst_scans" ? `${f.n} scans in 10 min` : `${f.n} failed mixes in 30 min`}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Players */}
        <section>
          <div className="flex items-center gap-3">
            <h2 className="wide text-lg">Players</h2>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, ID" className="ml-auto rounded-label bg-cobalt-900 px-3 py-2 text-sm w-64" />
            <button onClick={() => exportCsv(players)} className="rounded-label border border-cobalt-300 px-3 py-2 text-sm">Export CSV</button>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-label-dim">
                <tr><th className="py-2">Player</th><th>Catalyst</th><th className="text-right">Score</th><th className="text-right">Cmpd</th><th className="text-right">Elem</th><th className="text-right">Lends</th><th className="pl-4">Actions</th></tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const frozen = msUntil(p.frozen_until) > 0;
                  return (
                    <tr key={p.id} className={`border-t border-cobalt-800 ${p.disqualified ? "opacity-40" : ""}`}>
                      <td className="py-2">{p.display_name}{p.is_admin && " 🛡"}{p.is_test && <span className="ml-1 text-xs text-uranium">TEST</span>}{!p.verified && <span className="ml-1 text-xs text-amber">UNVERIFIED</span>}<span className="block text-xs text-label-dim">{p.is_test ? "username account" : p.student_id ?? p.email}{p.alliance && ` · ${p.alliance}`}</span></td>
                      <td>{p.catalyst}</td>
                      <td className="text-right tabular-nums">{p.score}</td>
                      <td className="text-right tabular-nums">{p.compounds_count}</td>
                      <td className="text-right tabular-nums">{p.elements}</td>
                      <td className="text-right tabular-nums">{p.lends_count}</td>
                      <td className="pl-4 whitespace-nowrap space-x-2">
                        <button className="rounded-label bg-label text-cobalt-900 font-semibold px-2 py-0.5" onClick={() => setManaging(p.id)}>Manage</button>
                        <button className="underline" onClick={() => act("admin_freeze", { p_player: p.id, p_minutes: frozen ? 0 : 15 }, frozen ? "Unfrozen" : "Frozen 15 min")}>
                          {frozen ? `Unfreeze (${clock(msUntil(p.frozen_until))})` : "Freeze"}
                        </button>
                        <button className="underline" onClick={() => {
                          const d = prompt(`Adjust ${p.display_name}'s score by (e.g. 50 or -20):`);
                          const reason = d && prompt("Reason (logged):");
                          if (d && Number(d)) void act("admin_adjust", { p_player: p.id, p_delta: Number(d), p_reason: reason ?? "" }, "Score adjusted");
                        }}>±pts</button>
                        <button className="underline" onClick={() => {
                          const n = prompt("New display name:", p.display_name);
                          if (n) void act("admin_rename", { p_player: p.id, p_name: n }, "Renamed");
                        }}>Rename</button>
                        <button className="underline text-hazard" onClick={() => {
                          if (confirm(`${p.disqualified ? "Reinstate" : "Disqualify"} ${p.display_name}?`))
                            void act("admin_disqualify", { p_player: p.id, p_dq: !p.disqualified }, p.disqualified ? "Reinstated" : "Disqualified");
                        }}>{p.disqualified ? "Reinstate" : "DQ"}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Settings */}
        <section>
          <h2 className="wide text-lg">Rules</h2>
          <p className="text-sm text-label-dim">Changes apply instantly to every player.</p>
          <div className="mt-3 grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {NUM_SETTINGS.map(({ key, label }) => (
              <label key={key} className="text-sm">
                <span className="block text-label-dim">{label}</span>
                <input type="number" step="any" defaultValue={String(s[key])} onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })}
                  className="mt-1 w-full rounded-label bg-cobalt-900 p-2 tabular-nums" />
              </label>
            ))}
          </div>
          <button disabled={!Object.keys(draft).length} onClick={async () => { await act("admin_update_settings", { p: draft }, "Rules saved"); setDraft({}); }}
            className="mt-4 rounded-label bg-label text-cobalt-900 font-bold px-6 py-3 disabled:opacity-40">Save rules</button>
        </section>
      </div>

      {managing && <PlayerManager playerId={managing} onClose={() => setManaging(null)} onChanged={load} />}

      {/* Live feed */}
      <aside>
        <h2 className="wide text-lg">Live feed</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {feed.map((f) => (
            <li key={f.id} className="flex gap-2">
              <span aria-hidden className="w-5 text-center">{FEED_ICON[f.kind] ?? "•"}</span>
              <span className="flex-1">{f.message}</span>
              <time className="text-label-dim text-xs tabular-nums">{new Date(f.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function exportCsv(rows: PlayerRow[]) {
  const cols = ["display_name", "email", "student_id", "catalyst", "score", "compounds_count", "niche_points", "lends_count", "elements", "alliance", "verified", "is_test", "disqualified"] as const;
  // Display names are player-controlled: neutralize spreadsheet formulas (=, +, -, @, tab, CR) before quoting.
  const esc = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return `"${s.replaceAll('"', '""')}"`;
  };
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `secret-catalyst-players-${new Date().toISOString().slice(0, 16)}.csv`;
  a.click();
}
