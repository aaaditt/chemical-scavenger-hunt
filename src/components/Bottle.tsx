import { TIER_STYLE, displaySymbol, type Tier, type CompoundTier } from "@/lib/game";
import { PIPS, compoundLiquid } from "@/lib/sprites";
import { CompoundVessel, Pips, TierVessel } from "./Sprite";

/** Map the old pixel `size` prop onto the one pixel scale: 4 (shelf) or 8 (the one hero sprite per screen). */
function scaleFor(size: number) {
  return size >= 120 ? 8 : 4;
}

/**
 * An element bottle. Rarity is carried by SHAPE (jar / round flask / diamond decanter / hazard ampoule),
 * pip count and the text tag — never color alone. `empty` renders the ghost outline of a slot not yet collected.
 */
export function Bottle({
  symbol, name, tier, size = 74, empty = false, borrowed = false, plate = true,
}: {
  symbol: string; name: string; tier: Tier; size?: number; empty?: boolean; borrowed?: boolean; plate?: boolean;
}) {
  const sc = scaleFor(size);
  const sym = displaySymbol(symbol);
  const label = `${name}${empty ? ", not collected" : ""}${borrowed ? ", shared by an ally" : ""}. ${TIER_STYLE[tier].label}.`;
  return (
    <figure className="flex flex-col items-center select-none" aria-label={label} role="img">
      <div className="relative">
        <TierVessel tier={tier} scale={sc} ghost={empty} ghostColor={borrowed ? "var(--color-holo)" : undefined} />
        {/* Symbol label pasted on the glass (Atkinson 700: C vs O, Cl vs Ci must never be in doubt). */}
        <span
          className={`absolute left-1/2 -translate-x-1/2 font-num leading-none px-1 ${empty && !borrowed ? "text-moss" : "bg-clinic text-ink"}`}
          style={{ top: 10 * sc, fontSize: sc === 8 ? 28 : sym.length > 2 ? 12 : 15, paddingTop: 2, paddingBottom: 2 }}
          aria-hidden
        >
          {sym}
        </span>
      </div>
      {plate && (
        <figcaption
          className={`mt-2 w-[76px] py-1 flex flex-col items-center gap-1 text-center ${empty && !borrowed ? "text-fog" : "bg-clinic text-ink"}`}
          style={{ boxShadow: empty && !borrowed ? "inset 0 0 0 4px var(--color-moss)" : "var(--shadow-px)" }}
          aria-hidden
        >
          <span className="font-num text-[14px] leading-[16px] truncate max-w-[68px]">{name}</span>
          {borrowed ? <span className="text-[12px] leading-[12px] font-bold">ALLY</span> : <Pips n={PIPS[tier] ?? 1} size={6} gap={3} />}
        </figcaption>
      )}
    </figure>
  );
}

/** Compound flask. Catalyzed compounds wear the catalyst's color (private screens only); Legendary has its own crown flask. */
export function Flask({
  formula, name, tier, size = 80, first = false, catalyst = null, sealed = false, caption = true,
}: {
  formula: string; name: string; tier: CompoundTier; size?: number; first?: boolean; catalyst?: string | null;
  sealed?: boolean; caption?: boolean;
}) {
  const sc = scaleFor(size);
  return (
    <figure className="flex flex-col items-center select-none" role="img"
      aria-label={`${name}${sealed ? "" : ` (${formula})`}. ${TIER_STYLE[tier].label}${first ? ". First on campus" : ""}.`}>
      <div className="relative">
        <CompoundVessel liquid={compoundLiquid(tier, catalyst)} scale={sc} sealed={sealed} legendary={tier === "legendary"} />
        {first && (
          <span className="absolute -right-3 -top-1 px-1 bg-candle text-ink pf-16" aria-hidden>1ST</span>
        )}
      </div>
      {caption && (
        <figcaption className="mt-2 w-[96px] py-1 bg-clinic text-ink flex flex-col items-center gap-1 text-center" style={{ boxShadow: "var(--shadow-px)" }} aria-hidden>
          {!sealed && <span className="font-num text-[15px] leading-[16px]">{formula}</span>}
          <span className="font-num text-[14px] leading-[16px] truncate max-w-[88px]">{name}</span>
          <Pips n={PIPS[tier] ?? 1} size={6} gap={3} />
        </figcaption>
      )}
    </figure>
  );
}
