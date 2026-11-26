"use client";
import { useCallback, useEffect, useState } from "react";
import { useGame } from "@/components/GameProvider";
import { errorMessage } from "@/lib/messages";
import { rpc } from "@/lib/supabase";

type Settings = { restrict_domain: boolean; allowed_domain: string; require_verification: boolean; username_login: boolean; test_mode: boolean; game_open: boolean };
type Pending = { id: string; email: string; display_name: string; created_at: string; verified: boolean; is_test: boolean };
type Admin = { email: string; signed_in: boolean };
type Audit = { action: string; target: string | null; payload: Record<string, unknown>; created_at: string; admin: string | null };

function Toggle({ on, label, help, onChange, danger }: { on: boolean; label: string; help: string; onChange: (v: boolean) => void; danger?: boolean }) {
  return (
    <div className="flex items-start gap-4 rounded-label bg-cobalt-900 p-4">
      <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
        className={`mt-0.5 shrink-0 w-14 h-8 rounded-full relative transition ${on ? (danger ? "bg-amber" : "bg-uranium") : "bg-cobalt-700"}`}>
        <span className={`absolute top-1 size-6 rounded-full bg-white transition-all ${on ? "left-7" : "left-1"}`} />
      </button>
      <div>
        <p className="font-semibold">{label} <span className="text-sm font-normal text-label-dim">— {on ? "ON" : "OFF"}</span></p>
        <p className="text-sm text-label-dim">{help}</p>
      </div>
    </div>
  );
}

export default function AccessPage() {
  const { toast } = useGame();
  const [s, setS] = useState<Settings | null>(null);
  const [players, setPlayers] = useState<Pending[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [newAdmin, setNewAdmin] = useState("");
  const [msg, setMsg] = useState("");
  const [domain, setDomain] = useState("");
  const [bulk, setBulk] = useState({ onlyTest: true, elements: 5, compounds: 2, hints: 2, rare: false });

  const load = useCallback(async () => {
    const [o, p, a, l] = await Promise.all([
      rpc<{ data: { settings: Settings } }>("admin_overview"),
      rpc<{ data: Pending[] }>("admin_players", { p_search: "", p_limit: 1000 }),
      rpc<{ data: Admin[] }>("admin_list_admins"),
      rpc<{ data: Audit[] }>("admin_audit_log", { p_limit: 60 }),
    ]);
    if (o.ok) {
      const st = (o as unknown as { data: { settings: Settings } }).data.settings;
      setS(st);
      setDomain((d) => d || st.allowed_domain);
    }
    if (p.ok) setPlayers((p as unknown as { data: Pending[] }).data);
    if (a.ok) setAdmins((a as unknown as { data: Admin[] }).data);
    if (l.ok) setAudit((l as unknown as { data: Audit[] }).data);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch; setState runs after await
  useEffect(() => void load(), [load]);

  async function act(fn: string, args: Record<string, unknown>, ok: string) {
    const r = await rpc(fn, args);
    toast(r.ok ? ok : errorMessage(r.error), r.ok ? "good" : "bad");
    void load();
    return r;
  }
  const set = (p: Partial<Settings>, ok: string) => act("admin_update_settings", { p }, ok);

  if (!s) return <p className="text-label-dim">Loading…</p>;
  const pending = players.filter((p) => !p.verified);
  const testers = players.filter((p) => p.is_test);

  return (
    <div className="max-w-4xl space-y-10">
      <section>
        <h1 className="wide text-2xl">Access &amp; testing</h1>
        <p className="text-label-dim mt-1">Every switch applies instantly. Changes are written to the audit log at the bottom.</p>
        <div className="mt-4 grid gap-3">
          <Toggle on={s.restrict_domain} label="University emails only"
            help={`ON: only @${s.allowed_domain} Google accounts can sign up. OFF: any Google account can. Organizer emails always work.`}
            onChange={(v) => set({ restrict_domain: v }, v ? "University-only sign-in" : "Any Google account can sign in")} />
          <Toggle on={s.require_verification} label="Verify every new player"
            help="ON: new players can sign in but can't play until an organizer verifies them below. Existing players are unaffected."
            onChange={(v) => set({ require_verification: v }, v ? "New players need verification" : "Verification off")} />
          <Toggle on={s.username_login} danger label="Username sign-in (no Google)"
            help="ON: the login page offers 'play with a username'. Anyone can make throwaway test accounts — use only for testing. They're marked as test players."
            onChange={(v) => set({ username_login: v }, v ? "Username sign-in ON" : "Username sign-in OFF")} />
          <Toggle on={s.test_mode} danger label="Test server"
            help="ON: a 'Test server' banner shows to everyone and test players appear on leaderboards and the big screen. OFF: test players are hidden from boards."
            onChange={(v) => set({ test_mode: v }, v ? "Test server ON" : "Test server OFF")} />
        </div>
        <form className="mt-3 flex items-center gap-2 text-sm" onSubmit={(e) => { e.preventDefault(); void set({ allowed_domain: domain.trim().toLowerCase() } as Partial<Settings>, "Domain saved"); }}>
          <label htmlFor="dom" className="text-label-dim">University domain</label>
          <input id="dom" value={domain} onChange={(e) => setDomain(e.target.value)} className="rounded-label bg-cobalt-900 px-3 py-2 w-72" />
          <button className="underline">Save</button>
        </form>
      </section>

      <section>
        <div className="flex items-center gap-3">
          <h2 className="wide text-lg">Verification queue ({pending.length})</h2>
          {pending.length > 0 && <button onClick={() => act("admin_verify_all", {}, "Everyone verified")} className="ml-auto rounded-label bg-uranium text-cobalt-950 font-bold px-4 py-2">Verify all</button>}
        </div>
        {pending.length === 0 ? <p className="text-sm text-label-dim mt-2">Nobody is waiting.</p> : (
          <ul className="mt-3 divide-y divide-cobalt-800">
            {pending.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="flex-1">{p.display_name} <span className="text-label-dim">{p.is_test ? "(username test account)" : p.email}</span></span>
                <button onClick={() => act("admin_verify", { p_player: p.id, p_verified: true }, "Verified")} className="rounded-label bg-label text-cobalt-900 font-semibold px-3 py-1">Verify</button>
                <button onClick={() => { if (confirm(`Delete ${p.display_name}'s account?`)) void act("admin_delete_player", { p_player: p.id }, "Deleted"); }} className="text-hazard underline">Reject</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="wide text-lg">Organizers</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {admins.map((a) => (
            <li key={a.email} className="flex items-center gap-3">
              <span className="flex-1">{a.email} <span className="text-label-dim">{a.signed_in ? "· signed in" : "· not signed in yet"}</span></span>
              <button onClick={() => { if (confirm(`Remove ${a.email} as organizer?`)) void act("admin_set_admin", { p_email: a.email, p_admin: false }, "Removed"); }} className="text-hazard underline">Remove</button>
            </li>
          ))}
        </ul>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); void act("admin_set_admin", { p_email: newAdmin, p_admin: true }, "Organizer added").then(() => setNewAdmin("")); }}>
          <input value={newAdmin} onChange={(e) => setNewAdmin(e.target.value)} placeholder="email@…" aria-label="New organizer email" className="flex-1 rounded-label bg-cobalt-900 px-3 py-2" />
          <button className="rounded-label bg-label text-cobalt-900 font-bold px-4">Add organizer</button>
        </form>
        <p className="mt-1 text-xs text-label-dim">Any Google account can be an organizer, even outside the university domain.</p>
      </section>

      <section>
        <h2 className="wide text-lg">Give random stuff</h2>
        <p className="text-sm text-label-dim">Hand out random elements, compounds and hints — to test players only, or everyone. For one player, use Manage on the control room.</p>
        <div className="mt-3 flex flex-wrap items-end gap-3 text-sm">
          <label>Elements<input type="number" min={0} value={bulk.elements} onChange={(e) => setBulk({ ...bulk, elements: +e.target.value })} className="block w-20 mt-1 rounded-label bg-cobalt-900 p-2" /></label>
          <label>Compounds<input type="number" min={0} value={bulk.compounds} onChange={(e) => setBulk({ ...bulk, compounds: +e.target.value })} className="block w-20 mt-1 rounded-label bg-cobalt-900 p-2" /></label>
          <label>Hints<input type="number" min={0} value={bulk.hints} onChange={(e) => setBulk({ ...bulk, hints: +e.target.value })} className="block w-20 mt-1 rounded-label bg-cobalt-900 p-2" /></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={bulk.rare} onChange={(e) => setBulk({ ...bulk, rare: e.target.checked })} />Include rare/isotope</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={bulk.onlyTest} onChange={(e) => setBulk({ ...bulk, onlyTest: e.target.checked })} />Test players only ({testers.length})</label>
          <button className="rounded-label bg-amber text-cobalt-950 font-bold px-4 py-2"
            onClick={() => act("admin_give_random_all", { p_only_test: bulk.onlyTest, p_elements: bulk.elements, p_compounds: bulk.compounds, p_hints: bulk.hints, p_include_rare: bulk.rare }, "Handed out")}>
            Give to {bulk.onlyTest ? "test players" : "everyone"}
          </button>
        </div>
      </section>

      <section>
        <h2 className="wide text-lg">Announce</h2>
        <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); void act("admin_broadcast", { p_message: msg }, "Announced").then(() => setMsg("")); }}>
          <input value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={200} placeholder="Shown in every player's live feed and on the big screen" aria-label="Announcement" className="flex-1 rounded-label bg-cobalt-900 px-3 py-2" />
          <button className="rounded-label bg-label text-cobalt-900 font-bold px-4">Send</button>
        </form>
      </section>

      <section className="rounded-label border-2 border-hazard p-5 space-y-4">
        <h2 className="wide text-lg text-hazard">Danger zone</h2>
        <Row label={`Delete all ${testers.length} test players`} help="Removes every username test account and everything they did.">
          <button onClick={() => { if (confirm("Delete all test players?")) void act("admin_delete_test_players", {}, "Test players deleted"); }} className="rounded-label border border-hazard text-hazard px-4 py-2">Delete test players</button>
        </Row>
        <Row label="Reshuffle secret catalysts" help="Deals a fresh, balanced catalyst to every player. Do this before the event if you've been testing.">
          <button onClick={() => { if (confirm("Give every player a new secret catalyst?")) void act("admin_reshuffle_catalysts", {}, "Catalysts reshuffled"); }} className="rounded-label border border-hazard text-hazard px-4 py-2">Reshuffle</button>
        </Row>
        <Row label="Reset the whole game" help="Wipes every score, element, compound, alliance, event and the feed. Keeps accounts, catalysts, QR codes and settings.">
          <button onClick={() => { const t = prompt('Type RESET GAME to wipe all progress:'); if (t) void act("admin_reset_game", { p_confirm: t }, "Game reset"); }} className="rounded-label bg-hazard px-4 py-2 font-bold">Reset game</button>
        </Row>
      </section>

      <section>
        <h2 className="wide text-lg">Audit log</h2>
        <ul className="mt-2 text-sm space-y-1 max-h-96 overflow-y-auto">
          {audit.map((a, i) => (
            <li key={i} className="flex gap-3">
              <time className="text-label-dim tabular-nums w-20 shrink-0">{new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
              <span className="w-28 shrink-0 text-label-dim truncate">{a.admin ?? "—"}</span>
              <span className="font-semibold w-44 shrink-0">{a.action}</span>
              <span className="text-label-dim truncate">{JSON.stringify(a.payload)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Row({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1"><p className="font-semibold">{label}</p><p className="text-sm text-label-dim">{help}</p></div>
      {children}
    </div>
  );
}
