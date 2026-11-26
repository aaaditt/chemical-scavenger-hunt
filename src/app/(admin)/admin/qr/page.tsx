"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useGame } from "@/components/GameProvider";
import { QrCode } from "@/components/QrCode";
import { TIER_STYLE, displaySymbol, msUntil, type Tier } from "@/lib/game";
import { errorMessage } from "@/lib/messages";
import { rpc, supabase, SITE_URL } from "@/lib/supabase";

type QrRow = { id: string; code: string; kind: "element" | "hint"; element: string | null; element_name: string | null; tier: Tier | null;
  compound: string | null; compound_name: string | null; cap: number | null; claimed_count: number; active_until: string | null;
  location_label: string; enabled: boolean };
type El = { symbol: string; name: string; tier: Tier };
type Cmp = { id: string; name: string; formula: string; locked_hint: string | null };

const DEFAULT_CAP: Record<Tier, string> = { common: "", uncommon: "", rare: "5", isotope: "3" };

export default function QrAdmin() {
  const { toast } = useGame();
  const [rows, setRows] = useState<QrRow[]>([]);
  const [elements, setElements] = useState<El[]>([]);
  const [compounds, setCompounds] = useState<Cmp[]>([]);
  const [form, setForm] = useState({ kind: "element" as "element" | "hint", element: "H", compound: "", cap: "", location: "", count: 1 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    const r = await rpc<{ data: QrRow[] }>("admin_list_qr");
    if (r.ok) setRows((r as unknown as { data: QrRow[] }).data);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch; setState runs after await
    void load();
    supabase().from("elements").select("symbol,name,tier").order("points").then(({ data }) => setElements((data as El[]) ?? []));
    rpc<{ data: Cmp[] }>("admin_compounds").then((r) => r.ok && setCompounds((r as unknown as { data: Cmp[] }).data.filter((c) => c.locked_hint)));
  }, [load]);

  const shown = useMemo(() => rows.filter((r) =>
    !filter || [r.code, r.element, r.element_name, r.compound_name, r.location_label].some((v) => v?.toLowerCase().includes(filter.toLowerCase()))), [rows, filter]);
  const printing = rows.filter((r) => selected.has(r.id));
  const tierOf = (sym: string) => elements.find((e) => e.symbol === sym)?.tier ?? "common";

  async function create() {
    const r = await rpc<{ codes: string[] }>("admin_create_qr", {
      p_kind: form.kind, p_element: form.kind === "element" ? form.element : "", p_compound: form.kind === "hint" ? form.compound : "",
      p_cap: form.cap ? Number(form.cap) : null, p_location: form.location, p_count: form.count,
    });
    if (!r.ok) return toast(errorMessage(r.error), "bad");
    toast(`Created ${(r as unknown as { codes: string[] }).codes.length} code(s)`, "good");
    await load();
  }

  return (
    <div>
      <div className="print:hidden space-y-8">
        <section className="rounded-label bg-cobalt-900 p-5">
          <h1 className="wide text-xl">Create QR codes</h1>
          <p className="text-sm text-label-dim mt-1">
            Make several copies of common elements for different spots. Rare elements and isotopes get a claim cap — only the first N players to scan get it.
            Isotope QRs stay dormant until you release them from the control room.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 items-end">
            <label className="text-sm">Type
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as "element" | "hint" })} className="block mt-1 rounded-label bg-cobalt-800 p-2">
                <option value="element">Element</option><option value="hint">Hint (unlocks a recipe)</option>
              </select>
            </label>
            {form.kind === "element" ? (
              <label className="text-sm">Element
                <select value={form.element} onChange={(e) => setForm({ ...form, element: e.target.value, cap: DEFAULT_CAP[tierOf(e.target.value)] })} className="block mt-1 rounded-label bg-cobalt-800 p-2">
                  {elements.map((e) => <option key={e.symbol} value={e.symbol}>{e.name} ({e.tier})</option>)}
                </select>
              </label>
            ) : (
              <label className="text-sm">Compound hint
                <select value={form.compound} onChange={(e) => setForm({ ...form, compound: e.target.value })} className="block mt-1 rounded-label bg-cobalt-800 p-2">
                  <option value="">Choose…</option>
                  {compounds.map((c) => <option key={c.id} value={c.id}>{c.name} {c.formula}</option>)}
                </select>
              </label>
            )}
            <label className="text-sm">Claim cap
              <input value={form.cap} onChange={(e) => setForm({ ...form, cap: e.target.value })} placeholder="none" className="block mt-1 w-20 rounded-label bg-cobalt-800 p-2" />
            </label>
            <label className="text-sm">Location
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Library stairs" className="block mt-1 w-48 rounded-label bg-cobalt-800 p-2" />
            </label>
            <label className="text-sm">Copies
              <input type="number" min={1} max={200} value={form.count} onChange={(e) => setForm({ ...form, count: +e.target.value })} className="block mt-1 w-20 rounded-label bg-cobalt-800 p-2" />
            </label>
            <button onClick={create} disabled={form.kind === "hint" && !form.compound} className="rounded-label bg-amber text-cobalt-950 font-bold px-5 py-2.5 disabled:opacity-40">Create</button>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3">
            <h2 className="wide text-lg">All codes ({rows.length})</h2>
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter" className="rounded-label bg-cobalt-900 px-3 py-2 text-sm" />
            <button onClick={() => setSelected(new Set(shown.map((r) => r.id)))} className="text-sm underline">Select shown</button>
            <button onClick={() => setSelected(new Set())} className="text-sm underline">Clear</button>
            <button onClick={() => window.print()} disabled={!printing.length} className="ml-auto rounded-label bg-label text-cobalt-900 font-bold px-5 py-2 disabled:opacity-40">
              Print {printing.length} placard{printing.length === 1 ? "" : "s"}
            </button>
          </div>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-label-dim"><tr><th className="w-8" /><th>Code</th><th>What</th><th>Location</th><th className="text-right">Claimed</th><th>Status</th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-t border-cobalt-800">
                  <td><input type="checkbox" aria-label={`Select ${r.code}`} checked={selected.has(r.id)} onChange={(e) => {
                    const n = new Set(selected);
                    if (e.target.checked) n.add(r.id); else n.delete(r.id);
                    setSelected(n);
                  }} /></td>
                  <td className="py-2 wide tracking-wider">{r.code}</td>
                  <td>{r.kind === "hint" ? `Hint: ${r.compound_name}` : `${r.element_name}`}<span className="text-label-dim"> {r.tier}</span></td>
                  <td>
                    <input defaultValue={r.location_label} aria-label="Location" className="bg-transparent border-b border-cobalt-700 w-40"
                      onBlur={async (e) => { if (e.target.value !== r.location_label) { await rpc("admin_update_qr", { p_id: r.id, p_enabled: r.enabled, p_location: e.target.value, p_cap: r.cap }); void load(); } }} />
                  </td>
                  <td className="text-right tabular-nums">{r.claimed_count}{r.cap ? ` / ${r.cap}` : ""}</td>
                  <td>
                    <button className="underline" onClick={async () => { await rpc("admin_update_qr", { p_id: r.id, p_enabled: !r.enabled, p_location: r.location_label, p_cap: r.cap }); void load(); }}>
                      {r.enabled ? (r.tier === "isotope" ? (msUntil(r.active_until) > 0 ? "LIVE" : "dormant") : "on") : "disabled"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {/* Print sheet: 2×3 placards per A4 page. */}
      <div className="hidden print:grid grid-cols-2 gap-0">
        {printing.map((r) => <Placard key={r.id} row={r} />)}
      </div>
      <style>{`@media print { @page { size: A4; margin: 8mm; } body { background: #fff !important; } }`}</style>
    </div>
  );
}

function Placard({ row }: { row: QrRow }) {
  const tier = row.tier ?? "common";
  const accent = tier === "common" ? "#16246b" : tier === "isotope" ? "#7a9b00" : TIER_STYLE[tier].color;
  return (
    <div className="h-[92mm] border border-dashed border-gray-400 p-[6mm] flex flex-col items-center justify-between text-[#101b55] break-inside-avoid" style={{ borderTop: `8mm solid ${accent}` }}>
      <div className="flex w-full items-center justify-between">
        <span className="wide text-[22pt] leading-none">{row.kind === "hint" ? "?" : displaySymbol(row.element ?? "")}</span>
        <span className="text-[9pt] text-right">{row.kind === "hint" ? "Hint" : `${row.element_name}`}<br />{tier !== "common" && tier.toUpperCase()}</span>
      </div>
      <QrCode value={`${SITE_URL}/s/${row.code}`} size={190} />
      <div className="text-center">
        <p className="wide text-[13pt]">Secret Catalyst</p>
        <p className="text-[8pt]">Scan with your phone camera · code {row.code}</p>
      </div>
    </div>
  );
}
