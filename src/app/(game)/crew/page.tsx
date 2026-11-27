"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useGame } from "@/components/GameProvider";
import { useNow } from "@/components/Shell";
import { QrCode } from "@/components/QrCode";
import { clock, displaySymbol, msUntil } from "@/lib/game";
import { errorMessage } from "@/lib/messages";
import { rpc } from "@/lib/supabase";

type Alliance = { id: string; name: string; invite_code: string; members: { name: string; score: number; me: boolean; common: string[] }[] } | null;

async function share(title: string, text: string, url: string, onCopied: () => void) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch {
      /* user cancelled */
    }
  }
  await navigator.clipboard.writeText(`${text} ${url}`);
  onCopied();
}

export default function CrewPage() {
  const { state, refresh, toast } = useGame();
  const now = useNow();
  const [alliance, setAlliance] = useState<Alliance>(null);
  const [allianceName, setAllianceName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [showQr, setShowQr] = useState<string | null>(null);

  const loadAlliance = useCallback(async () => {
    const r = await rpc<{ alliance: Alliance }>("my_alliance");
    if (r.ok) setAlliance((r as unknown as { alliance: Alliance }).alliance);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch; setState runs after await
  useEffect(() => void loadAlliance(), [loadAlliance]);

  if (!state) return null;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const p = state.player;
  const liveCodes = state.codes.filter((c) => !c.used_at && msUntil(c.expires_at) > 0);
  const usedCodes = state.codes.filter((c) => c.used_at).slice(0, 5);
  const giftable = state.elements.filter((e) => e.giftable);
  const giftsLeft = state.settings.gift_links_per_player - state.gifts.length;
  void now;

  async function act(fn: string, args: Record<string, unknown> | undefined, ok: (r: Record<string, unknown>) => void) {
    setBusy(true);
    const r = await rpc(fn, args);
    setBusy(false);
    if (!r.ok) toast(errorMessage(r.error), "bad");
    else ok(r as Record<string, unknown>);
    void refresh();
    void loadAlliance();
  }

  return (
    <div className="space-y-9">
      {/* Secret catalyst */}
      <section>
        <h1 className="pf-24">Your catalyst</h1>
        <div className="mt-3 panel p-5">
          <p className="text-5xl" aria-hidden>{p.catalyst.emoji}</p>
          <p className="pf-24 mt-2">{p.catalyst.name}</p>
          <p className="mt-1">{p.catalyst.flavor} Other players need this for their best compounds. Only you know you have it — unless you tell them.</p>
          <p className="mt-3 text-sm">Each successful lend earns you <b>{state.settings.catalysis_bonus_pct}%</b> of that compound&apos;s points. Lent so far: <b>{p.lends_count}</b></p>
          <button disabled={busy} onClick={() => act("create_catalyst_code", undefined, (r) => setShowQr(String(r.code)))}
            className="btn btn-dark w-full mt-4">Lend my catalyst</button>
        </div>

        {liveCodes.map((c) => (
          <div key={c.code} className="mt-3 panel-dark p-4">
            <div className="flex items-center justify-between">
              <p className="font-num text-[32px] tracking-[0.2em] text-candle">{c.code}</p>
              <p className="text-sm text-fog tabular-nums">expires {clock(msUntil(c.expires_at))}</p>
            </div>
            {showQr === c.code && <div className="mt-3 flex justify-center"><QrCode value={`${origin}/mix?cat=${c.code}`} size={200} /></div>}
            <div className="mt-3 flex gap-2">
              <button onClick={() => setShowQr(showQr === c.code ? null : c.code)} className="btn btn-plain flex-1">
                {showQr === c.code ? "Hide QR" : "Show QR"}
              </button>
              <button onClick={() => share("Catalyst", `Here's my catalyst code for Secret Catalyst: ${c.code}`, `${origin}/mix?cat=${c.code}`, () => toast("Link copied", "good"))}
                className="btn btn-plain flex-1">Send link</button>
            </div>
            <p className="mt-2 text-xs text-fog">One use. They paste it on their mix bench or scan the QR.</p>
          </div>
        ))}
        {usedCodes.length > 0 && (
          <ul className="mt-3 text-sm text-fog space-y-1">
            {usedCodes.map((c) => (
              <li key={c.code}>{c.code} — used by {c.used_by ?? "someone"} {c.success ? "✓ worked" : "✗ failed"}</li>
            ))}
          </ul>
        )}
      </section>

      {/* Alliance */}
      <section>
        <h2 className="pf-24">Alliance</h2>
        {alliance ? (
          <div className="mt-3 panel-dark p-4">
            <p className="wide text-lg">{alliance.name}</p>
            <ul className="mt-2 space-y-2">
              {alliance.members.map((m) => (
                <li key={m.name} className="flex justify-between text-sm">
                  <span>{m.name}{m.me && " (you)"}<span className="block text-fog text-xs">{m.common.map(displaySymbol).join(" ") || "no commons yet"}</span></span>
                  <span className="tabular-nums">{m.score}</span>
                </li>
              ))}
            </ul>
            {alliance.members.length < state.settings.alliance_max && (
              <div className="mt-4">
                <p className="text-sm">Invite code <span className="wide tracking-widest text-candle text-lg">{alliance.invite_code}</span></p>
                <button onClick={() => share("Join my alliance", `Join my Secret Catalyst alliance "${alliance.name}":`, `${origin}/join/${alliance.invite_code}`, () => toast("Invite copied", "good"))}
                  className="btn btn-plain w-full mt-2">Send invite</button>
              </div>
            )}
            <p className="mt-4 text-xs text-fog">Allies share common elements and hints. Catalysts and rare elements stay yours.</p>
            <button disabled={busy}
              onClick={() => { if (confirm(`Leave "${alliance.name}"? It costs ${state.settings.alliance_leave_penalty} points and you can never rejoin.`)) void act("alliance_leave", undefined, () => toast(`You left. −${state.settings.alliance_leave_penalty}`, "bad")); }}
              className="mt-3 text-sm text-alarm underline">Leave alliance (−{state.settings.alliance_leave_penalty} pts)</button>
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            <p className="text-sm text-fog">Team up with up to {state.settings.alliance_max - 1} others. You&apos;ll be able to use each other&apos;s common elements and see each other&apos;s unlocked hints.</p>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void act("alliance_create", { p_name: allianceName }, () => toast("Alliance founded", "good")); }}>
              <input value={allianceName} onChange={(e) => setAllianceName(e.target.value)} placeholder="Alliance name" maxLength={28}
                aria-label="Alliance name" className="flex-1 min-w-0 h-12 bg-bench text-text px-3 font-num text-[16px] shadow-px" />
              <button disabled={busy} className="btn btn-plain">Found</button>
            </form>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void act("alliance_join", { p_code: joinCode }, (r) => toast(`Joined ${r.alliance}`, "good")); }}>
              <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="Invite code" maxLength={6}
                aria-label="Alliance invite code" className="flex-1 min-w-0 h-12 bg-bench text-text px-3 font-num text-[18px] tracking-widest shadow-px" />
              <button disabled={busy} className="btn btn-plain">Join</button>
            </form>
          </div>
        )}
      </section>

      {/* Gifts */}
      <section>
        <h2 className="pf-24">Gift an element</h2>
        <p className="mt-1 text-sm text-fog">Some elements can be copied to a friend. You keep yours. {giftsLeft} of {state.settings.gift_links_per_player} gift links left.</p>
        {giftable.length === 0 ? (
          <p className="mt-3 text-sm text-fog">You don&apos;t have a giftable element yet (Na, Cl, S, Ca, K, Mg, Fe).</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {giftable.map((e) => (
              <button key={e.symbol} disabled={busy || giftsLeft <= 0}
                onClick={() => act("create_gift_link", { p_element: e.symbol }, (r) =>
                  void share("Gift", `I'm gifting you ${e.name} in Secret Catalyst 🎁`, `${origin}/g/${r.code}`, () => toast("Gift link copied", "good")))}
                className="btn btn-plain font-num normal-case text-[18px]">{displaySymbol(e.symbol)}</button>
            ))}
          </div>
        )}
        {state.gifts.length > 0 && (
          <ul className="mt-3 text-sm text-fog space-y-1">
            {state.gifts.map((g) => (
              <li key={g.code}>{g.element} · {g.redeemed_by ? `claimed by ${g.redeemed_by}` : <button className="underline" onClick={() => share("Gift", "Gift:", `${origin}/g/${g.code}`, () => toast("Copied", "good"))}>unclaimed — resend</button>}</li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-2 gap-4">
        <Link href="/recap" className="btn btn-plain">Lab recap</Link>
        <Link href="/settings" className="btn btn-dark">Settings</Link>
      </div>
    </div>
  );
}
