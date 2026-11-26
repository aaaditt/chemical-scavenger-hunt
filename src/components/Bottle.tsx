import { TIER_STYLE, displaySymbol, type Tier, type CompoundTier } from "@/lib/game";

const GLASS: Record<Tier, { fill: string; edge: string }> = {
  common: { fill: "rgba(225,232,255,0.16)", edge: "rgba(225,232,255,0.55)" },
  uncommon: { fill: "rgba(63,198,168,0.30)", edge: "rgba(63,198,168,0.9)" },
  rare: { fill: "rgba(242,169,59,0.42)", edge: "rgba(242,169,59,1)" },
  isotope: { fill: "rgba(198,255,61,0.40)", edge: "rgba(198,255,61,1)" },
};

/**
 * A reagent bottle with a periodic-table label. The signature visual of the game.
 * `empty` renders a dashed ghost bottle for elements not yet collected.
 */
export function Bottle({
  symbol,
  name,
  tier,
  size = 92,
  empty = false,
  borrowed = false,
}: {
  symbol: string;
  name: string;
  tier: Tier;
  size?: number;
  empty?: boolean;
  borrowed?: boolean;
}) {
  const g = GLASS[tier];
  const glow = tier === "rare" || tier === "isotope";
  const sym = displaySymbol(symbol);
  return (
    <figure
      className={`flex flex-col items-center select-none ${glow && !empty ? "animate-glow" : ""}`}
      style={{ width: size, ["--glow" as string]: TIER_STYLE[tier].glow }}
      aria-label={`${name}${empty ? " (not collected)" : ""}`}
    >
      <svg viewBox="0 0 80 110" width={size} height={size * 1.375} aria-hidden>
        {/* cap */}
        <rect x="27" y="2" width="26" height="14" rx="3" fill={empty ? "none" : "#0b1340"} stroke={empty ? g.edge : "none"} strokeDasharray={empty ? "3 3" : undefined} />
        {/* neck */}
        <path d="M31 16 h18 v10 q0 4 4 6 l10 6 q9 5 9 15 v44 q0 9 -9 9 h-46 q-9 0 -9 -9 v-44 q0 -10 9 -15 l10 -6 q4 -2 4 -6 z"
          fill={empty ? "none" : g.fill} stroke={g.edge} strokeWidth="2" strokeDasharray={empty ? "4 4" : undefined} />
        {/* liquid line */}
        {!empty && <path d="M10 64 q15 -5 30 0 t30 0 v32 q0 6 -6 6 h-48 q-6 0 -6 -6 z" fill={g.fill} />}
        {/* highlight */}
        {!empty && <path d="M16 50 q2 -6 8 -9" stroke="rgba(255,255,255,.6)" strokeWidth="3" strokeLinecap="round" fill="none" />}
        {/* periodic label */}
        {!empty && (
          <g>
            <rect x="15" y="56" width="50" height="38" rx="3" fill="#f7f8fc" />
            <rect x="15" y="56" width="50" height="5" rx="1" fill={tier === "common" ? "#16246b" : TIER_STYLE[tier].color} />
          </g>
        )}
        <text x="40" y={empty ? 74 : 84} textAnchor="middle"
          style={{ fontStretch: "125%", fontWeight: 800, fontSize: sym.length > 2 ? 15 : 22 }}
          fill={empty ? g.edge : "#101b55"}>
          {sym}
        </text>
      </svg>
      <figcaption className={`mt-1 text-[11px] leading-tight text-center ${empty ? "text-cobalt-300" : "text-label-dim"}`}>
        {name}
        {borrowed && <span className="block text-verdigris">ally&apos;s</span>}
      </figcaption>
    </figure>
  );
}

/** Erlenmeyer flask for synthesized compounds. */
export function Flask({ formula, name, tier, size = 92, first = false }: { formula: string; name: string; tier: CompoundTier; size?: number; first?: boolean }) {
  const t = TIER_STYLE[tier];
  const special = tier === "rare" || tier === "isotope" || tier === "legendary";
  return (
    <figure className={`flex flex-col items-center ${special ? "animate-glow" : ""}`} style={{ width: size, ["--glow" as string]: t.glow }}>
      <svg viewBox="0 0 80 100" width={size} height={size * 1.25} aria-hidden>
        <path d="M30 4 h20 v6 h-2 v22 l24 50 q4 10 -6 12 h-52 q-10 -2 -6 -12 l24 -50 v-22 h-2 z"
          fill="rgba(225,232,255,0.12)" stroke={t.color} strokeWidth="2.2" />
        <path d="M22 62 h36 l13 28 q2 4 -3 4 h-56 q-5 0 -3 -4 z" fill={t.color} opacity="0.85" />
        <circle cx="34" cy="76" r="2.5" fill="#fff" opacity=".7" />
        <circle cx="46" cy="70" r="1.6" fill="#fff" opacity=".7" />
        {first && <text x="62" y="20" fontSize="16" fill="#f2a93b" aria-label="first discoverer">★</text>}
      </svg>
      <figcaption className="mt-1 text-center leading-tight">
        <span className="block wide text-[13px]" style={{ color: t.color }}>{formula}</span>
        <span className="block text-[11px] text-label-dim">{name}</span>
      </figcaption>
    </figure>
  );
}
