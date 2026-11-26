"use client";
import { useCallback, useEffect, useState } from "react";
import { useGame } from "@/components/GameProvider";
import { TIER_STYLE, formatRecipe, type CompoundTier } from "@/lib/game";
import { errorMessage } from "@/lib/messages";
import { rpc } from "@/lib/supabase";

type Cmp = { id: string; name: string; formula: string; recipe: Record<string, number>; catalyst: string | null; tier: CompoundTier;
  points: number; locked_hint: string | null; first_by: string | null; made_by: number; riddle?: string };

/** Answer key + live catalog editing (points, riddles, hints). Recipes are changed in content/catalog.json. */
export default function CatalogPage() {
  const { toast } = useGame();
  const [rows, setRows] = useState<Cmp[]>([]);
  const [q, setQ] = useState("");
  const load = useCallback(async () => {
    const r = await rpc<{ data: Cmp[] }>("admin_compounds");
    if (r.ok) setRows((r as unknown as { data: Cmp[] }).data);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch; setState runs after await
  useEffect(() => void load(), [load]);

  async function save(id: string, points: number, hint: string | null) {
    const r = await rpc("admin_update_compound", { p_id: id, p_points: points, p_riddle: null, p_locked_hint: hint });
    toast(r.ok ? "Saved" : errorMessage(r.error), r.ok ? "good" : "bad");
    void load();
  }

  const shown = rows.filter((c) => !q || `${c.name} ${c.formula} ${c.id} ${c.catalyst}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="wide text-2xl">Catalog &amp; answer key</h1>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="ml-auto rounded-label bg-cobalt-900 px-3 py-2 text-sm" />
      </div>
      <p className="text-sm text-label-dim mt-1">Organizers only — this is every recipe. Edit points and locked hints live; points apply to future syntheses.</p>
      <table className="mt-4 w-full text-sm">
        <thead className="text-left text-label-dim"><tr><th>Compound</th><th>Recipe</th><th>Catalyst</th><th>Tier</th><th className="text-right">Made by</th><th>First</th><th>Points</th><th>Locked hint</th></tr></thead>
        <tbody>
          {shown.map((c) => (
            <tr key={c.id} className="border-t border-cobalt-800 align-top">
              <td className="py-2">{c.name}<span className="block text-label-dim">{c.formula}</span></td>
              <td className="wide text-xs">{formatRecipe(c.recipe)}</td>
              <td>{c.catalyst ?? "—"}</td>
              <td style={{ color: TIER_STYLE[c.tier].color }}>{c.tier}</td>
              <td className="text-right tabular-nums">{c.made_by}</td>
              <td className="text-label-dim">{c.first_by ?? "—"}</td>
              <td><input type="number" defaultValue={c.points} aria-label={`${c.name} points`} className="w-16 rounded-label bg-cobalt-900 p-1"
                onBlur={(e) => { if (+e.target.value !== c.points) void save(c.id, +e.target.value, null); }} /></td>
              <td><input defaultValue={c.locked_hint ?? ""} aria-label={`${c.name} locked hint`} className="w-72 rounded-label bg-cobalt-900 p-1"
                onBlur={(e) => { if (e.target.value !== (c.locked_hint ?? "")) void save(c.id, c.points, e.target.value); }} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
