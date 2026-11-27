"use client";
import { useEffect, useState } from "react";
import { FeedIcon, cleanFeed, useFeed, useLeaderboard, type BoardRow } from "@/components/Leaderboard";
import { useNow } from "@/components/Shell";
import { CompoundVessel, Halo, Hazard, Sprite } from "@/components/Sprite";
import { clock, msUntil } from "@/lib/game";
import { supabase } from "@/lib/supabase";

type Ev = { id: string; kind: string; label: string; ends_at: string };
const px = { boxShadow: "0 -8px 0 0 #071312, 0 8px 0 0 #071312, -8px 0 0 0 #071312, 8px 0 0 0 #071312" };

/**
 * Projector view (1920×1080, design/screens/screen.html). Public, no sign-in. Names follow each player's
 * opt-out (the RPCs return "Lab 0248" for hidden players). NEVER shows a catalyst or recipe during play:
 * new discoveries appear as the sealed "?" flask; the reveal is the finale.
 */
export function BigScreen() {
  const overall = useLeaderboard("score", 10);
  const speed = useLeaderboard("compounds", 1);
  const niche = useLeaderboard("niche", 1);
  const feed = useFeed(12);
  const now = useNow();
  const [events, setEvents] = useState<Ev[]>([]);

  useEffect(() => {
    const sb = supabase();
    const load = () => sb.from("game_events").select("id,kind,label,ends_at").gt("ends_at", new Date().toISOString())
      .then(({ data }) => setEvents((data as Ev[]) ?? []));
    void load();
    const ch = sb.channel("screen-events").on("postgres_changes", { event: "*", schema: "public", table: "game_events" }, load).subscribe();
    const t = setInterval(load, 15_000);
    return () => { clearInterval(t); void sb.removeChannel(ch); };
  }, []);
  const live = events.filter((e) => msUntil(e.ends_at) > 0);
  void now;
  const firstFind = feed.find((f) => f.kind === "first_discovery");
  const firstName = firstFind ? cleanFeed(firstFind.message).replace(/ discovered .*$/, "") : null;
  const firstCompound = firstFind ? cleanFeed(firstFind.message).match(/ discovered (.+?) (?:—|-) first/)?.[1] ?? null : null;
  const lines = feed.filter((f) => f.id !== firstFind?.id).slice(0, 5);

  return (
    <div className="h-dvh w-full overflow-hidden flex flex-col bg-wall text-clinic">
      <header className="flex items-stretch gap-8 px-12 pt-8 pb-6 bg-bench" style={{ boxShadow: "0 8px 0 0 #071312" }}>
        <h1 className="self-center" style={{ fontFamily: "var(--font-pixel)", fontSize: 80, lineHeight: "80px" }}>
          <span className="text-clinic">SECRET </span><span className="text-candle">CATALYST</span>
        </h1>
        <Award title="Speed chemist" row={speed?.[0]} metric={(r) => `${r.compounds_count} compounds`} />
        <Award title="Master of the obscure" row={niche?.[0]} metric={(r) => `${r.niche_points} pts`} />
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-[1.25fr_1fr] gap-12 px-12 pt-10 pb-6">
        <section className="flex flex-col min-h-0">
          <div className="flex items-center gap-6">
            <h2 className="led px-4 py-3" style={{ fontFamily: "var(--font-pixel)", fontSize: 40, lineHeight: "40px", ...px }}>LEADERBOARD</h2>
            <p className="font-num text-[28px] text-fog">Scan the QRs around campus. Make compounds.</p>
          </div>
          <div className="mt-6 grid grid-cols-[96px_1fr_200px_200px] gap-x-6 pf-24 text-fog px-2">
            <span /><span>Player</span><span>Compounds</span><span className="text-right">Score</span>
          </div>
          <ol className="mt-3 flex-1 flex flex-col gap-3">
            {overall?.map((r, i) => (
              <li key={r.display_name + r.rank} className={`grid grid-cols-[96px_1fr_200px_200px] gap-x-6 items-center h-[60px] ${i < 3 ? "bg-clinic text-ink" : "bg-bench"}`} style={i < 3 ? px : undefined}>
                <span className={`h-full grid place-items-center font-num text-[36px] ${i === 0 ? "bg-candle text-ink" : i < 3 ? "bg-ink text-clinic" : "bg-tile text-clinic"}`}>{r.rank}</span>
                <span className="font-num text-[36px] truncate">{r.display_name}</span>
                <span className="font-num text-[32px] flex items-center gap-3"><Sprite name="mini" scale={4} pal={i < 3 ? undefined : { k: "#dce7ee" }} /> {r.compounds_count}</span>
                <span className={`font-num text-[40px] text-right pr-4 ${i < 3 ? "" : "text-holo"}`}>{r.score}</span>
              </li>
            ))}
            {overall?.length === 0 && <li className="font-num text-[36px] text-fog">Waiting for the first chemist…</li>}
          </ol>
        </section>

        <section className="flex flex-col gap-8 min-h-0">
          {live.map((e) => (
            <div key={e.id} className={e.kind === "isotope_drop" ? "bg-tier-isotope text-ink" : "bg-ink text-hazard"} style={px}>
              <Hazard w={160} h={2} scale={4} className="w-full h-2" />
              <div className="p-6 flex items-center justify-between gap-6">
                <div>
                  <p className="pf-24">{e.kind === "isotope_drop" ? "Unstable isotope loose" : "Black market open"}</p>
                  <p className="font-num text-[40px] mt-3">{e.label}</p>
                </div>
                <p className="pf-64">{clock(msUntil(e.ends_at))}</p>
              </div>
            </div>
          ))}

          {firstFind && (
            <div className="bg-bench p-6 flex gap-8 items-center" style={px}>
              <div className="relative grid place-items-center shrink-0" style={{ width: 256, height: 256 }}>
                <div className="absolute inset-0"><Halo r={32} color="#ffb547" scale={4} solidOn="#0b1a19" /></div>
                <div className="relative"><CompoundVessel liquid="common" sealed scale={8} /></div>
              </div>
              <div className="min-w-0">
                <p className="pf-24 bg-candle text-ink inline-block px-3 py-2" style={px}>First on campus</p>
                <p className="mt-6 truncate" style={{ fontFamily: "var(--font-pixel)", fontSize: 64, lineHeight: "64px" }}>{(firstCompound ?? "?").toUpperCase()}</p>
                <div className="mt-4 flex items-center gap-4">
                  {firstFind.payload?.tier === "catalyzed" && (
                    <span className="bg-parchment text-ink px-3 py-2 pf-24 inline-flex items-center gap-3" style={px}><Sprite name="i_mystery" scale={3} />Catalyzed ?</span>
                  )}
                </div>
                <p className="mt-4 font-num text-[32px]">{firstName}, {new Date(firstFind.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}</p>
                <p className="mt-2 font-num text-[28px] text-holo">How? Revealed at the finale.</p>
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-hidden">
            <h2 className="led inline-block px-4 py-3" style={{ fontFamily: "var(--font-pixel)", fontSize: 40, lineHeight: "40px", ...px }}>LIVE</h2>
            <ul className="mt-6 flex flex-col gap-4">
              {lines.map((f, i) => (
                <li key={f.id} className={`flex items-center gap-5 ${i === 0 ? "animate-pop bg-tier-isotope/0" : ""}`}>
                  <span className="font-num text-[28px] text-led w-[100px] shrink-0">{new Date(f.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                  <span aria-hidden className="shrink-0"><FeedIcon kind={f.kind} scale={5} /></span>
                  <span className={`font-num text-[32px] leading-[40px] ${f.kind.startsWith("isotope") ? "text-tier-isotope" : f.kind === "first_discovery" ? "text-candle" : ""}`}>{cleanFeed(f.message)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
      <Hazard w={480} h={4} scale={4} className="w-full h-4" />
    </div>
  );
}

function Award({ title, row, metric }: { title: string; row: BoardRow | undefined; metric: (r: BoardRow) => string }) {
  return (
    <div className="bg-clinic text-ink px-6 py-3 min-w-[360px]" style={px}>
      <p className="pf-24">{title}</p>
      <p className="mt-2 font-num text-[36px] leading-[40px] truncate">{row ? `${row.display_name} · ${metric(row)}` : "Unclaimed"}</p>
    </div>
  );
}
