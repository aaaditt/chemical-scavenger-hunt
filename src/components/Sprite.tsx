import { SPR, LIQ, TIER_SPRITE, runs, ghostRows, haloRects, mixHex, type Liquid, type SpriteName, type ElementTier, type CatalystId } from "@/lib/sprites";

/**
 * Pixel sprites as crisp SVG rects. One art pixel = `scale` CSS px (4 on phone, 8 for the one hero sprite per screen).
 * Never anti-aliased (shape-rendering crispEdges), never smoothly scaled.
 */
export function Sprite({
  name, scale = 4, pal, rows, className = "", children, label,
}: {
  name?: SpriteName; scale?: number; pal?: Record<string, string>; rows?: readonly string[];
  className?: string; children?: React.ReactNode; label?: string;
}) {
  const r = rows ?? (name ? SPR[name] : []);
  const w = r[0]?.length ?? 0, h = r.length;
  return (
    <svg className={`sprite ${className}`} width={w * scale} height={h * scale} viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {runs(r, pal).map((q, i) => <rect key={i} x={q.x} y={q.y} width={q.w} height={1} fill={q.fill} className={`c-${q.ch}`} />)}
      {children}
    </svg>
  );
}

function Bubbles({ at }: { at: [number, number][] }) {
  return <>{at.map(([x, y], i) => <rect key={i} className="bub" x={x} y={y} width={1} height={1} fill="#ffffff" style={{ animationDelay: `${-i * 400}ms` }} />)}</>;
}

/** 4-point sparkles; the FIRST never animates so Rare reads on a still screenshot and under reduced motion. */
function Sparkles({ at }: { at: [number, number][] }) {
  return (
    <>
      {at.map(([x, y], i) => (
        <g key={i} className={i ? "spk" : ""} style={{ animationDelay: `${-i * 530}ms` }}>
          <rect x={x - 1} y={y} width={3} height={1} fill="#ffffff" />
          <rect x={x} y={y - 1} width={1} height={3} fill="#ffffff" />
        </g>
      ))}
    </>
  );
}

/** Element vessel: shape carries the tier (jar / round flask / diamond decanter / hazard ampoule). */
export function TierVessel({
  tier, scale = 4, ghost = false, liquid, still = false, ghostColor = "var(--color-moss)",
}: { tier: ElementTier; scale?: number; ghost?: boolean; liquid?: Liquid; still?: boolean; ghostColor?: string }) {
  const rows = SPR[TIER_SPRITE[tier]];
  if (ghost) return <Sprite rows={ghostRows(rows)} pal={{ k: ghostColor }} scale={scale} className="ghost" />;
  const liq = liquid ?? tier;
  return (
    <Sprite rows={rows} pal={LIQ[liq]} scale={scale} className={tier === "isotope" && !liquid ? "iso" : ""}>
      {!still && !liquid && tier === "uncommon" && <Bubbles at={[[6, 16], [9, 15], [11, 16]]} />}
      {!liquid && tier === "rare" && <Sparkles at={[[2, 8], [14, 16], [13, 3]]} />}
    </Sprite>
  );
}

/** Compound vessel. `sealed` is the PUBLIC version: parchment wrap, red wax, "?" — never shows the catalyst color. */
export function CompoundVessel({
  liquid, scale = 4, sealed = false, still = false, legendary = false,
}: { liquid: Liquid; scale?: number; sealed?: boolean; still?: boolean; legendary?: boolean }) {
  if (sealed) {
    return (
      <Sprite rows={SPR.erlen} pal={LIQ.sealed} scale={scale}>
        {runs(SPR.qmark, {}, 6, 11).map((q, i) => <rect key={`q${i}`} x={q.x} y={q.y} width={q.w} height={1} fill={q.fill} />)}
      </Sprite>
    );
  }
  const rows = legendary ? SPR.crown : SPR.erlen;
  return (
    <Sprite rows={rows} pal={LIQ[liquid]} scale={scale} className={legendary ? "prism" : liquid === "isotope" ? "iso" : ""}>
      {!still && <Bubbles at={[[5, 16], [8, 14], [10, 17]]} />}
    </Sprite>
  );
}

export function CatalystIcon({ id, scale = 4, mystery = false, label }: { id?: CatalystId | string | null; scale?: number; mystery?: boolean; label?: string }) {
  const name = (mystery || !id ? "i_mystery" : `i_${id}`) as SpriteName;
  return <Sprite name={SPR[name] ? name : "i_mystery"} scale={scale} label={label} />;
}

export function Lamp({ scale = 4, out = false }: { scale?: number; out?: boolean }) {
  return (
    <Sprite rows={Array(12).fill("............")} scale={scale}>
      {runs(SPR.lampBase, {}, 0, 6).map((q, i) => <rect key={`b${i}`} x={q.x} y={q.y} width={q.w} height={1} fill={q.fill} />)}
      {!out && (["fA", "fB", "fC"] as const).map((f, j) => (
        <g key={f} className={`f${j + 1}`}>
          {runs(SPR[f]).map((q, i) => <rect key={i} x={q.x} y={q.y} width={q.w} height={1} fill={q.fill} />)}
        </g>
      ))}
    </Sprite>
  );
}

/**
 * Stepped octagon glow (the ONLY glow in the game). With `solidOn`, each ring is pre-mixed against that
 * background into an opaque color, so it never turns muddy (critic round 2, story card candle glow).
 */
export function Halo({ r, color, scale = 4, q = 2, solidOn, className = "" }: { r: number; color: string; scale?: number; q?: number; solidOn?: string; className?: string }) {
  return (
    <svg className={`sprite ${className}`} width={r * 2 * scale} height={r * 2 * scale} viewBox={`0 0 ${r * 2} ${r * 2}`} shapeRendering="crispEdges" aria-hidden>
      {haloRects(r, q).map((h, i) => (
        <rect key={i} x={h.x} y={h.y} width={h.w} height={h.h} fill={solidOn ? mixHex(color, solidOn, h.o) : color} fillOpacity={solidOn ? 1 : h.o} />
      ))}
    </svg>
  );
}

/** ref-2 door stripes as a pixel staircase (crisp diagonal). */
export function Hazard({ w, h, scale = 4, band = 4, className = "" }: { w: number; h: number; scale?: number; band?: number; className?: string }) {
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < h; y++) {
    let x = 0;
    const v0 = (a: number) => Math.floor((a + y) / band) % 2;
    while (x < w) {
      const v = v0(x);
      let e = x;
      while (e < w && v0(e) === v) e++;
      rects.push(<rect key={`${y}-${x}`} x={x} y={y} width={e - x} height={1} fill={v ? "#071312" : "#f7c61b"} />);
      x = e;
    }
  }
  return (
    <svg className={`sprite ${className}`} width={w * scale} height={h * scale} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" preserveAspectRatio="none" aria-hidden>
      {rects}
    </svg>
  );
}

/** Tier pips: rarity as a count, never color alone. */
export function Pips({ n, color = "currentColor", size = 8, gap = 4 }: { n: number; color?: string; size?: number; gap?: number }) {
  return (
    <span className="inline-flex" style={{ gap }} aria-hidden>
      {Array.from({ length: n }, (_, i) => <i key={i} style={{ width: size, height: size, background: color, display: "block" }} />)}
    </span>
  );
}
