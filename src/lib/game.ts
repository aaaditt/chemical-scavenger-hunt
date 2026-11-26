export type Tier = "common" | "uncommon" | "rare" | "isotope";
export type CompoundTier = "basic" | "catalyzed" | "uncommon" | "rare" | "isotope" | "legendary";

export type Catalyst = { id: string; name: string; emoji: string; flavor: string };

export type OwnedElement = {
  symbol: string;
  name: string;
  tier: Tier;
  points: number;
  giftable: boolean;
  source: "scan" | "gift" | "admin";
  at: string;
};

export type OwnedCompound = {
  id: string;
  name: string;
  formula: string;
  tier: CompoundTier;
  points: number;
  at: string;
  first: boolean;
  catalyst: string | null;
  lender: string | null;
};

export type GameEvent = { id: string; kind: "isotope_drop" | "black_market"; label: string; ends_at: string; played: boolean };

export type MyState = {
  player: {
    id: string;
    display_name: string;
    student_id: string | null;
    avatar_url: string | null;
    score: number;
    rank: number;
    compounds_count: number;
    niche_points: number;
    lends_count: number;
    frozen_until: string | null;
    wrong_streak: number;
    is_admin: boolean;
    disqualified: boolean;
    catalyst: Catalyst;
  };
  settings: {
    game_open: boolean;
    game_ends_at: string | null;
    wrong_streak_limit: number;
    freeze_minutes: number;
    gift_links_per_player: number;
    alliance_max: number;
    alliance_leave_penalty: number;
    catalysis_bonus_pct: number;
    market_safe_points: number;
    market_small_points: number;
    market_big_points: number;
    market_freeze_minutes: number;
    finale_revealed: boolean;
  };
  elements: OwnedElement[];
  ally_elements: string[];
  compounds: OwnedCompound[];
  codes: { code: string; expires_at: string; used_at: string | null; success: boolean | null; used_by: string | null }[];
  gifts: { code: string; element: string; redeemed_at: string | null; redeemed_by: string | null }[];
  events: GameEvent[];
};

export type HintCard = {
  id: string;
  tier: CompoundTier;
  points: number;
  riddle: string;
  slots: number;
  needs_catalyst: boolean;
  name: string | null;
  formula: string | null;
  made: boolean;
  locked_hint: string | null;
  has_locked_hint: boolean;
  first_by: string | null;
};

export const TIER_STYLE: Record<Tier | CompoundTier, { label: string; color: string; glow: string }> = {
  common: { label: "Common", color: "var(--color-label)", glow: "transparent" },
  basic: { label: "Basic", color: "var(--color-label)", glow: "transparent" },
  catalyzed: { label: "Catalyzed", color: "var(--color-cobalt-300)", glow: "rgba(154,168,230,.6)" },
  uncommon: { label: "Uncommon", color: "var(--color-verdigris)", glow: "rgba(63,198,168,.55)" },
  rare: { label: "Rare", color: "var(--color-amber)", glow: "rgba(242,169,59,.7)" },
  isotope: { label: "Unstable isotope", color: "var(--color-uranium)", glow: "rgba(198,255,61,.85)" },
  legendary: { label: "Legendary", color: "var(--color-legend)", glow: "rgba(255,122,217,.8)" },
};

/** Display symbol for isotope keys: C14 → ¹⁴C, U235 → ²³⁵U, D stays D. */
const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
export function displaySymbol(symbol: string): string {
  const m = symbol.match(/^([A-Z][a-z]?)(\d+)$/);
  if (!m) return symbol;
  return m[2].split("").map((d) => SUP[d]).join("") + m[1];
}

/** Canonical recipe key, mirroring public.recipe_key() in SQL. Used for local de-dupe of attempts. */
export function recipeKey(recipe: Record<string, number>): string {
  return Object.keys(recipe)
    .sort()
    .map((k) => `${k}:${recipe[k]}`)
    .join(",");
}

export function formatRecipe(recipe: Record<string, number>): string {
  return Object.entries(recipe)
    .map(([s, q]) => (q > 1 ? `${displaySymbol(s)}×${q}` : displaySymbol(s)))
    .join(" + ");
}

/** Extracts a QR code from either a full URL (…/s/CODE) or a raw code. */
export function parseScan(text: string): { kind: "qr" | "gift" | "catalyst" | "alliance"; code: string } | null {
  const t = text.trim();
  try {
    const u = new URL(t);
    const [, kind, code] = u.pathname.split("/");
    if (code && kind === "s") return { kind: "qr", code };
    if (code && kind === "g") return { kind: "gift", code };
    if (kind === "mix" && u.searchParams.get("cat")) return { kind: "catalyst", code: u.searchParams.get("cat")! };
    if (code && kind === "join") return { kind: "alliance", code };
    return null;
  } catch {
    return /^[A-Z0-9-]{4,24}$/i.test(t) ? { kind: "qr", code: t } : null;
  }
}

export function msUntil(iso: string | null | undefined): number {
  return iso ? Math.max(0, new Date(iso).getTime() - Date.now()) : 0;
}

export function clock(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
