import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { LIQ, PIPS, SPR, haloRects, mixHex, runs } from "@/lib/sprites";

// 1080×1920 Instagram story cards in the Night Shift direction (design/screens/story-card.html).
// Content stays inside y 240–1680 (IG's own UI covers the rest). Art pixel = 12px (hero sprite 24px).
// PUBLIC SURFACE RULE: compound cards never show the formula or the catalyst during play (sealed flask).
const W = 1080;
const H = 1920;
const C = {
  ink: "#071312", bench: "#0b1a19", wall: "#12302c", seam: "#0d2521", clinic: "#dce7ee", fog: "#8fb0a8",
  parch: "#eadf9e", parchShade: "#c9b96a", holo: "#43e6c6", led: "#8df25f", candle: "#ffb547", hazard: "#f7c61b",
  iso: "#d4ff2a", alarm: "#ff4b3e",
};
const TIER_TAG: Record<string, string> = {
  basic: "BASIC", catalyzed: "CATALYZED", uncommon: "UNCOMMON", rare: "RARE", isotope: "ISOTOPE", legendary: "LEGENDARY",
};

const clip = (s: string | null, n: number) => (s ?? "").slice(0, n);

// Fonts: Silkscreen (pixel display) + Atkinson Hyperlegible Bold (names, numbers). Fetched once per instance as TTF.
type Font = { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" };
let fontsPromise: Promise<Font[]> | null = null;
async function gfont(family: string, weight: 400 | 700): Promise<ArrayBuffer | null> {
  try {
    // No browser UA → Google serves TTF, which the image renderer supports.
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}
function fonts(): Promise<Font[]> {
  fontsPromise ??= (async () => {
    const [pixel, body] = await Promise.all([gfont("Silkscreen", 400), gfont("Atkinson+Hyperlegible", 700)]);
    const out: Font[] = [];
    if (pixel) out.push({ name: "Silkscreen", data: pixel, weight: 400, style: "normal" });
    if (body) out.push({ name: "Atkinson", data: body, weight: 700, style: "normal" });
    return out;
  })();
  return fontsPromise;
}

/** A sprite as an SVG of rects (satori renders <svg>). */
function SpriteSvg({ rows, pal, scale, extra }: { rows: readonly string[]; pal?: Record<string, string>; scale: number; extra?: React.ReactNode }) {
  const w = rows[0].length, h = rows.length;
  return (
    <svg width={w * scale} height={h * scale} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges">
      {runs(rows, pal).map((q, i) => <rect key={i} x={q.x} y={q.y} width={q.w} height={1} fill={q.fill} />)}
      {extra}
    </svg>
  );
}
function SealedFlask({ scale }: { scale: number }) {
  return <SpriteSvg rows={SPR.erlen} pal={LIQ.sealed} scale={scale}
    extra={runs(SPR.qmark, {}, 6, 11).map((q, i) => <rect key={`q${i}`} x={q.x} y={q.y} width={q.w} height={1} fill={q.fill} />)} />;
}
/** Stepped halo with SOLID pre-mixed colors (critic round 2: translucent candle glow went olive on the wall). */
function HaloSvg({ r, color, scale }: { r: number; color: string; scale: number }) {
  return (
    <svg width={r * 2 * scale} height={r * 2 * scale} viewBox={`0 0 ${r * 2} ${r * 2}`} shapeRendering="crispEdges">
      {haloRects(r, 2).map((h, i) => <rect key={i} x={h.x} y={h.y} width={h.w} height={h.h} fill={mixHex(color, C.wall, h.o)} />)}
    </svg>
  );
}
function Hazard({ h = 48 }: { h?: number }) {
  // Pixel staircase stripes at 12px per art pixel.
  const s = 12, w = Math.ceil(W / s), rows = h / s, band = 4;
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < w; x++) if (Math.floor((x + y) / band) % 2 === 0) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={C.hazard} />);
  return <svg width={W} height={h} viewBox={`0 0 ${w} ${rows}`} shapeRendering="crispEdges" style={{ background: C.ink }}>{rects}</svg>;
}
function Pips({ n, color = C.ink }: { n: number; color?: string }) {
  return <div style={{ display: "flex", gap: 8 }}>{Array.from({ length: n }, (_, i) => <div key={i} style={{ width: 16, height: 16, background: color }} />)}</div>;
}
const px = (n: number) => ({ boxShadow: `0 -${n}px 0 0 ${C.ink}, 0 ${n}px 0 0 ${C.ink}, -${n}px 0 0 0 ${C.ink}, ${n}px 0 0 0 ${C.ink}` });

/** Largest Silkscreen size that fits ~920px: 0.78em average advance. */
function heroSize(text: string) {
  for (const s of [128, 112, 96, 80, 64]) if (text.length * s * 0.78 <= 920) return s;
  return 64;
}

export async function GET(req: NextRequest, ctx: RouteContext<"/api/card/[kind]">) {
  const { kind } = await ctx.params;
  const q = req.nextUrl.searchParams;
  let body: React.ReactElement;

  if (kind === "compound") {
    const tier = TIER_TAG[q.get("tier") ?? "basic"] ? (q.get("tier") ?? "basic") : "basic";
    const name = clip(q.get("name"), 22).toUpperCase();
    const player = clip(q.get("player"), 24);
    const lab = clip(q.get("lab"), 6).replace(/[^0-9A-Z]/gi, "");
    const first = q.get("first") === "1";
    body = (
      <Frame>
        <div style={{ display: "flex", ...px(6), background: C.bench, color: C.led, fontFamily: "Silkscreen", fontSize: 64, padding: "16px 32px" }}>SYNTHESIZED</div>
        <div style={{ display: "flex", position: "relative", width: 528, height: 528, marginTop: 32, alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", position: "absolute", left: 0, top: 0 }}><HaloSvg r={22} color={C.candle} scale={12} /></div>
          <SealedFlask scale={18} />
        </div>
        <div style={{ display: "flex", fontFamily: "Silkscreen", fontSize: heroSize(name), color: C.clinic, marginTop: 24, lineHeight: 1 }}>{name}</div>
        <div style={{ display: "flex", gap: 24, marginTop: 32, alignItems: "center" }}>
          <div style={{ display: "flex", ...px(6), background: C.parch, color: C.ink, padding: "12px 20px", alignItems: "center", gap: 16 }}>
            <SpriteSvg rows={SPR.i_mystery} scale={6} />
            <div style={{ display: "flex", fontFamily: "Silkscreen", fontSize: 40 }}>{tier === "catalyzed" ? "CATALYZED ?" : TIER_TAG[tier]}</div>
          </div>
          <div style={{ display: "flex", ...px(6), background: C.clinic, padding: "20px 20px" }}><Pips n={PIPS[tier] ?? 1} /></div>
          <div style={{ display: "flex", ...px(6), background: C.holo, color: C.ink, fontFamily: "Atkinson", fontSize: 64, padding: "4px 24px" }}>+{clip(q.get("points"), 4).replace(/\D/g, "")}</div>
        </div>
        <div style={{ display: "flex", marginTop: 32, fontFamily: "Atkinson", fontSize: 44, color: C.clinic }}>
          {player}{lab ? ` · LAB ${lab}` : ""}
        </div>
        {first && (
          <div style={{ display: "flex", flexDirection: "column", ...px(6), background: C.parch, color: C.ink, padding: "24px 36px", marginTop: 32, width: 880 }}>
            <div style={{ display: "flex", fontFamily: "Silkscreen", fontSize: 48 }}>FIRST ON CAMPUS</div>
            <div style={{ display: "flex", fontFamily: "Atkinson", fontSize: 40, marginTop: 12 }}>How? Revealed at the finale.</div>
          </div>
        )}
      </Frame>
    );
  } else if (kind === "rank") {
    // Post-game (Lab Recap): the catalyst reveal is allowed here.
    body = (
      <Frame>
        <div style={{ display: "flex", fontFamily: "Atkinson", fontSize: 48, color: C.fog }}>{clip(q.get("name"), 24)} finished</div>
        <div style={{ display: "flex", fontFamily: "Silkscreen", fontSize: 320, color: C.candle, lineHeight: 1, marginTop: 24 }}>#{clip(q.get("rank"), 4).replace(/\D/g, "")}</div>
        <div style={{ display: "flex", fontFamily: "Atkinson", fontSize: 60, color: C.clinic, marginTop: 24 }}>
          {clip(q.get("score"), 6).replace(/\D/g, "")} points · {clip(q.get("compounds"), 3).replace(/\D/g, "")} compounds
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", ...px(6), background: C.parch, color: C.ink, padding: "32px 48px", marginTop: 80 }}>
          <div style={{ display: "flex", fontFamily: "Silkscreen", fontSize: 40 }}>MY SECRET CATALYST WAS</div>
          <div style={{ display: "flex", fontFamily: "Silkscreen", fontSize: 96, marginTop: 16 }}>{clip(q.get("catalyst"), 20).replace(/[^\w ]/g, "").trim().toUpperCase()}</div>
        </div>
      </Frame>
    );
  } else if (kind === "drop") {
    const isotope = q.get("kind") === "isotope";
    const color = isotope ? C.iso : C.hazard;
    body = (
      <Frame>
        <SpriteSvg rows={isotope ? SPR.ampoule : (SPR.haz as readonly string[])} pal={isotope ? LIQ.isotope : undefined} scale={isotope ? 24 : 48} />
        <div style={{ display: "flex", fontFamily: "Silkscreen", fontSize: 64, color, marginTop: 48, textAlign: "center" }}>{isotope ? "UNSTABLE ISOTOPE" : "BLACK MARKET OPEN"}</div>
        <div style={{ display: "flex", fontFamily: "Silkscreen", fontSize: heroSize(clip(q.get("title"), 20)), color: C.clinic, marginTop: 32, textAlign: "center" }}>{clip(q.get("title"), 20).toUpperCase()}</div>
        <div style={{ display: "flex", fontFamily: "Atkinson", fontSize: 72, color, marginTop: 40 }}>{clip(q.get("minutes"), 3).replace(/\D/g, "")} minutes. Go.</div>
        {/* Organizer decision: isotope posts may hint a rough area (never the exact QR spot). */}
        {q.get("hint") && (
          <div style={{ display: "flex", ...px(6), background: C.parch, color: C.ink, fontFamily: "Atkinson", fontSize: 48, padding: "24px 36px", marginTop: 48, textAlign: "center" }}>
            Last seen: {clip(q.get("hint"), 60)}
          </div>
        )}
      </Frame>
    );
  } else {
    return new Response("Unknown card", { status: 404 });
  }

  const f = await fonts();
  return new ImageResponse(body, {
    width: W,
    height: H,
    fonts: f.length ? f : undefined,
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}

function Frame({ children }: { children: React.ReactNode }) {
  // Wall tiles (ref-1): 4px seams on a 96×64 grid, drawn as gradient-free rect rows.
  return (
    <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: C.wall, color: C.clinic, fontFamily: "Atkinson", position: "relative" }}>
      <Hazard />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "176px 80px 0" }}>
        <div style={{ display: "flex", fontFamily: "Silkscreen", fontSize: 56 }}>
          <span style={{ color: C.clinic }}>SECRET&nbsp;</span><span style={{ color: C.candle }}>CATALYST</span>
        </div>
        <div style={{ display: "flex", ...px(4), background: C.bench, color: C.led, fontFamily: "Silkscreen", fontSize: 32, padding: "8px 16px" }}>BITS DUBAI</div>
      </div>
      <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 80px" }}>{children}</div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 24, paddingBottom: 240, paddingTop: 24 }}>
        <SpriteSvg rows={SPR.qr} scale={8} pal={{ k: C.clinic }} />
        <div style={{ display: "flex", fontFamily: "Atkinson", fontSize: 40, color: C.clinic }}>Hunt the QRs. Borrow a catalyst.&nbsp;<span style={{ color: C.candle }}>Beat this.</span></div>
      </div>
      <div style={{ display: "flex", position: "absolute", bottom: 0, left: 0 }}><Hazard /></div>
    </div>
  );
}

