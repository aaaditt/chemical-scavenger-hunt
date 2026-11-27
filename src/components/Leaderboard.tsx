"use client";
import { Sprite } from "./Sprite";
import type { SpriteName } from "@/lib/sprites";
import { useEffect, useState } from "react";
import { supabase, rpc } from "@/lib/supabase";

export type BoardKind = "score" | "compounds" | "niche" | "catalyst";
export type BoardRow = { display_name: string; avatar_url: string | null; score: number; compounds_count: number; niche_points: number; lends_count: number; rank: number };

export const BOARDS: { id: BoardKind; label: string; metric: (r: BoardRow) => number; unit: string }[] = [
  { id: "score", label: "Overall", metric: (r) => r.score, unit: "pts" },
  { id: "compounds", label: "Speed Chemist", metric: (r) => r.compounds_count, unit: "compounds" },
  { id: "niche", label: "Master of the Obscure", metric: (r) => r.niche_points, unit: "rare pts" },
  { id: "catalyst", label: "Most Sought-After", metric: (r) => r.lends_count, unit: "lends" },
];

/** Live leaderboard: refetches on every feed event (throttled) plus a slow poll. Works signed-out. */
export function useLeaderboard(kind: BoardKind, limit = 50) {
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  useEffect(() => {
    let alive = true;
    let pending: ReturnType<typeof setTimeout> | null = null;
    const load = async () => {
      const r = await rpc<{ data: BoardRow[] }>("leaderboard", { p_kind: kind, p_limit: limit });
      if (alive && r.ok) setRows((r as unknown as { data: BoardRow[] }).data);
    };
    const schedule = () => {
      if (!pending) pending = setTimeout(() => { pending = null; void load(); }, 1500);
    };
    void load();
    const sb = supabase();
    const ch = sb.channel(`board-${kind}-${Math.random()}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "feed" }, schedule).subscribe();
    const poll = setInterval(load, 20_000);
    return () => {
      alive = false;
      clearInterval(poll);
      if (pending) clearTimeout(pending);
      void sb.removeChannel(ch);
    };
  }, [kind, limit]);
  return rows;
}

export type FeedItem = { id: number; kind: string; message: string; created_at: string; payload?: { compound?: string; tier?: string } | null };

export function useFeed(limit = 20) {
  const [items, setItems] = useState<FeedItem[]>([]);
  useEffect(() => {
    const sb = supabase();
    sb.from("feed").select("id,kind,message,created_at,payload").order("id", { ascending: false }).limit(limit)
      .then(({ data }) => setItems((data as FeedItem[]) ?? []));
    const ch = sb.channel(`feed-${Math.random()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "feed" }, (p) =>
        setItems((cur) => [p.new as FeedItem, ...cur].slice(0, limit)))
      .subscribe();
    return () => void sb.removeChannel(ch);
  }, [limit]);
  return items;
}

export const FEED_ICON: Record<string, string> = {
  first_discovery: "★", synthesis: "⚗", rare: "◆", isotope: "☢", isotope_drop: "☢", black_market: "🕶", market: "🎲",
  freeze: "🧊", alliance: "⚭", betrayal: "🗡", system: "•",
};

const FEED_SPRITE: Record<string, SpriteName> = {
  first_discovery: "star", synthesis: "mini", rare: "mini", isotope: "haz", isotope_drop: "haz", black_market: "haz",
  market: "haz", freeze: "flake", alliance: "i_mystery", betrayal: "smoke", system: "mini",
};
/** Pixel icon for a feed line (no emoji in the lab). */
export function FeedIcon({ kind, scale = 3 }: { kind: string; scale?: number }) {
  return <Sprite name={FEED_SPRITE[kind] ?? "mini"} scale={scale} />;
}
/** SQL feed lines carry emoji from the old skin; strip them for the pixel UI. */
export function cleanFeed(msg: string): string {
  return msg.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "").replace(/\s{2,}/g, " ").trim();
}
