"use client";
import { useState } from "react";
import { useGame } from "@/components/GameProvider";
import { BOARDS, FEED_ICON, useFeed, useLeaderboard, type BoardKind } from "@/components/Leaderboard";

export default function BoardPage() {
  const { state } = useGame();
  const [kind, setKind] = useState<BoardKind>("score");
  const rows = useLeaderboard(kind);
  const feed = useFeed(15);
  const board = BOARDS.find((b) => b.id === kind)!;
  const me = state?.player.display_name;

  return (
    <div>
      <h1 className="wide text-2xl">Leaderboard</h1>
      <div className="mt-3 -mx-4 px-4 flex gap-2 overflow-x-auto" role="tablist">
        {BOARDS.map((b) => (
          <button key={b.id} role="tab" aria-selected={kind === b.id} onClick={() => setKind(b.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${kind === b.id ? "bg-label text-cobalt-900 font-semibold" : "border border-cobalt-600"}`}>
            {b.label}
          </button>
        ))}
      </div>
      <ol className="mt-4 space-y-1">
        {!rows && <li className="text-label-dim">Loading…</li>}
        {rows?.length === 0 && <li className="text-label-dim">No one on the board yet. Be first.</li>}
        {rows?.map((r) => (
          <li key={r.display_name + r.rank}
            className={`flex items-center gap-3 rounded-label px-3 py-2.5 ${r.display_name === me ? "bg-amber text-cobalt-950" : r.rank <= 3 ? "bg-cobalt-700" : "bg-cobalt-900/60"}`}>
            <span className="wide w-8 tabular-nums">{r.rank}</span>
            <span className="flex-1 truncate">{r.display_name}</span>
            <span className="wide tabular-nums">{board.metric(r)}</span>
            <span className="text-xs opacity-70 w-14">{board.unit}</span>
          </li>
        ))}
      </ol>

      <h2 className="wide text-xl mt-9">Live from the lab</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {feed.map((f) => (
          <li key={f.id} className="flex gap-2">
            <span aria-hidden className="w-5 text-center">{FEED_ICON[f.kind] ?? "•"}</span>
            <span className="flex-1">{f.message}</span>
            <time className="text-label-dim tabular-nums text-xs">{new Date(f.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
          </li>
        ))}
      </ul>
    </div>
  );
}
