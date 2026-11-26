"use client";
import { useEffect, useState } from "react";
import { FEED_ICON, useFeed, useLeaderboard, type BoardRow } from "@/components/Leaderboard";
import { useNow } from "@/components/Shell";
import { clock, msUntil } from "@/lib/game";
import { supabase } from "@/lib/supabase";

type Ev = { id: string; kind: string; label: string; ends_at: string };

/** Projector view (1920×1080). Public — no sign-in, display names only. */
export function BigScreen() {
  const overall = useLeaderboard("score", 10);
  const speed = useLeaderboard("compounds", 3);
  const niche = useLeaderboard("niche", 3);
  const lends = useLeaderboard("catalyst", 3);
  const feed = useFeed(9);
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

  return (
    <div className="h-dvh w-full overflow-hidden grid grid-cols-[1.35fr_1fr] gap-10 p-12">
      <section className="flex flex-col min-h-0">
        <h1 className="wide text-[64px] leading-none">Secret Catalyst</h1>
        <p className="text-2xl text-label-dim mt-2">Scan the QR codes around campus. Make compounds. Find your catalyst.</p>
        <ol className="mt-8 flex-1 space-y-2">
          {overall?.map((r, i) => (
            <li key={r.display_name} className={`flex items-center gap-6 rounded-label px-6 py-3 ${i === 0 ? "bg-amber text-cobalt-950" : i < 3 ? "bg-cobalt-600" : "bg-cobalt-900/70"}`}>
              <span className="wide text-4xl w-16 tabular-nums">{r.rank}</span>
              <span className="text-3xl flex-1 truncate">{r.display_name}</span>
              <span className="text-xl opacity-70 tabular-nums">{r.compounds_count} {r.compounds_count === 1 ? "compound" : "compounds"}</span>
              <span className="wide text-4xl tabular-nums w-40 text-right">{r.score}</span>
            </li>
          ))}
          {overall?.length === 0 && <li className="text-3xl text-label-dim">Waiting for the first chemist…</li>}
        </ol>
      </section>

      <section className="flex flex-col gap-6 min-h-0">
        {live.map((e) => (
          <div key={e.id} className={`rounded-glass p-6 ${e.kind === "isotope_drop" ? "bg-uranium text-cobalt-950" : "bg-black text-amber border-2 border-amber"}`}>
            <p className="text-2xl">{e.kind === "isotope_drop" ? "☢️ Unstable isotope loose" : "🕶️ Black market open"}</p>
            <div className="flex items-baseline justify-between">
              <p className="wide text-4xl">{e.label}</p>
              <p className="wide text-6xl tabular-nums">{clock(msUntil(e.ends_at))}</p>
            </div>
          </div>
        ))}
        <div className="grid grid-cols-3 gap-4">
          <Mini title="Speed Chemist" rows={speed} metric={(r) => `${r.compounds_count}`} />
          <Mini title="Most Obscure" rows={niche} metric={(r) => `${r.niche_points}`} />
          <Mini title="Most Sought-After" rows={lends} metric={(r) => `${r.lends_count}`} />
        </div>
        <div className="flex-1 min-h-0 rounded-glass bg-cobalt-950/70 p-6 overflow-hidden">
          <p className="text-xl text-label-dim">Live from the lab</p>
          <ul className="mt-3 space-y-3">
            {feed.map((f, i) => (
              <li key={f.id} className={`flex gap-3 text-2xl ${i === 0 ? "animate-pop" : ""} ${f.kind === "first_discovery" ? "text-amber" : f.kind.startsWith("isotope") ? "text-uranium" : ""}`}>
                <span aria-hidden className="w-8 text-center">{FEED_ICON[f.kind] ?? "•"}</span>
                <span className="flex-1">{f.message}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Mini({ title, rows, metric }: { title: string; rows: BoardRow[] | null; metric: (r: BoardRow) => string }) {
  return (
    <div className="rounded-glass bg-cobalt-900/80 p-4">
      <p className="text-lg text-label-dim">{title}</p>
      <ol className="mt-2 space-y-1">
        {rows?.map((r) => (
          <li key={r.display_name} className="flex justify-between text-xl gap-2">
            <span className="truncate">{r.display_name}</span><span className="wide tabular-nums">{metric(r)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
