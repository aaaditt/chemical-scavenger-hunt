/**
 * Pixel sprite data for the "Night Shift" direction (design/direction.md, design/screens/kit.js).
 * One character = one art pixel. '.' is transparent. Colors come from P, overridden per liquid by LIQ.
 * Rendering lives in src/components/Sprite.tsx; this file is plain data + pure helpers (also used by next/og).
 */

export const P: Record<string, string> = {
  k: "#071312", K: "#071312", g: "#183b36", G: "#2c5a52", w: "#e9fff9", l: "#dce7ee", m: "#a9bcc8", R: "#8a3b32", r: "#5a231e",
  c: "#9a7048", C: "#5e4026", Y: "#f7c61b", o: "#ff5a36", y: "#ffb547", W: "#fff4c2", A: "#c98a2a", a: "#ffb547", S: "#ffe14a",
  Z: "#d9a400", f: "#dce7ee", P: "#a57bff", E: "#4db2ff", N: "#4bf08b", n: "#b9ffd2", Q: "#ff5fae", q: "#b8306e", T: "#ffffff",
  t: "#9daec6", x: "#e9e2d0", z: "#071312", v: "#5e676b", V: "#8a9599", F: "#bdf4ff", j: "#6cc9e6", s: "#8a9a96", p: "#eadf9e",
  U: "#ff4b3e", u: "#7a1f19",
};

export type Liquid =
  | "common" | "uncommon" | "rare" | "isotope" | "legendary"
  | "heat" | "pressure" | "light" | "electricity" | "enzyme" | "acid"
  | "sludge" | "frozen" | "empty" | "sealed";

export const LIQ: Record<Liquid, Record<string, string>> = {
  common: { L: "#9fc2b8", D: "#6f9388", H: "#cfe6de" },
  uncommon: { L: "#3ff0e6", D: "#16b3b5", H: "#b5fff8" },
  rare: { L: "#e4ecf7", D: "#9daec6", H: "#ffffff" },
  isotope: { L: "#d4ff2a", D: "#8dc20a", H: "#f3ffb0" },
  legendary: { L: "#ffcb3d", D: "#d9851c", H: "#fff0b0", c: "#ffcb3d" },
  heat: { L: "#ff5a36", D: "#b8321c", H: "#ffb09a" },
  pressure: { L: "#a57bff", D: "#6c46c9", H: "#d9c7ff" },
  light: { L: "#ffe14a", D: "#c9a400", H: "#fff4b0" },
  electricity: { L: "#4db2ff", D: "#1f6fc2", H: "#b8e0ff" },
  enzyme: { L: "#4bf08b", D: "#1fa85a", H: "#b9ffd2" },
  acid: { L: "#ff5fae", D: "#b8306e", H: "#ffc2e0" },
  sludge: { L: "#6b5a2e", D: "#463a1c", H: "#8c7a44" },
  frozen: { L: "#bdf4ff", D: "#6cc9e6", H: "#ffffff", l: "#e9fbff", m: "#9fdcf0", g: "#9fdcf0", G: "#bdf4ff" },
  empty: { L: "#183b36", D: "#183b36", H: "#2c5a52" },
  /* PUBLIC SURFACES ONLY: parchment wrap + red wax, so the liquid color can't give away the catalyst. */
  sealed: { L: "#eadf9e", D: "#c9b96a", H: "#f6efc4", c: "#ff4b3e" },
};

export const SPR = {
  jar: ["................", "................", "................", "....kkkkkkkk....", "....kRRRRRRk....", "....krrrrrrk....", "...kkkkkkkkkk...", "..kwggggggggGk..", "..kwggggggggGk..", "..kHHHHHHHHHHk..", "..kLllllllllLk..", "..kLllllllllLk..", "..kLllllllllLk..", "..kLllllllllLk..", "..kLmmmmmmmmLk..", "..kwLLLLLLLLLk..", "..kLLLLLLLLLLk..", "..kDLLLLLLLLDk..", "..kDDDDDDDDDDk..", "...kkkkkkkkkk..."],
  flask: ["................", "......kkkk......", "......kcck......", "......kCCk......", ".....kkkkkk.....", "......kwgk......", "......kwgk......", ".....kkwgkk.....", "....kgwgggGk....", "...kHHHHHHHHk...", "..kLllllllllLk..", "..kLllllllllLk..", ".kLLllllllllLLk.", ".kLLllllllllLLk.", ".kwLmmmmmmmmLLk.", ".kwLLLLLLLLLLLk.", ".kLLLLLLLLLLLDk.", "..kDLLLLLLLLDk..", "...kDDDDDDDDk...", "....kkkkkkkk...."],
  decanter: [".......kk.......", "......kTTk......", ".....kTTttk.....", ".....ktTTtk.....", "......kttk......", ".......kk.......", "......kwgk......", "......kwgk......", ".....kHHHHk.....", "....kwLLLLLk....", "...kllllllllk...", "..kLllllllllLk..", ".kwLllllllllLLk.", "kwLLmmmmmmmmLLLk", ".kwLLLLLLLLLLLk.", "..kLLLLLLLLLLk..", "...kDLLLLLLDk...", "....kDDDDDDk....", "......kGGk......", "....kkkkkkkk...."],
  ampoule: [".......kk.......", "......kwgk......", "......kwgk......", ".....kkwgkk.....", "....kYKYKYKk....", "....kKYKYKYk....", "....kwggggGk....", "...kkHHHHHHkk...", "..kwLLLLLLLLLk..", "..kwLLLLLLLLLk..", "..kLllllllllLk..", "..kLllllllllLk..", "..kLllllllllLk..", "..kLllllllllLk..", "..kLmmmmmmmmLk..", "..kwLLLLLLLLLk..", "..kLLLLLLLLLLk..", "...kDLLLLLLDk...", "....kDDDDDDk....", ".....kkkkkk....."],
  erlen: ["................", ".....kkkkkk.....", ".....kcccck.....", "......kkkk......", "......kwgk......", "......kwgk......", "......kwgk......", ".....kwgggk.....", ".....kwgggk.....", "....kHHHHHHk....", "....kwLLLLLk....", "...kwLLLLLLLk...", "...kLLLLLLLLk...", "..kLLLLLLLLLLk..", "..kLLLLLLLLLLk..", ".kLLLLLLLLLLLLk.", ".kLLLLLLLLLLLLk.", "kDLLLLLLLLLLLLDk", "kDDDDDDDDDDDDDDk", "kkkkkkkkkkkkkkkk"],
  /* Legendary compounds get their own silhouette (critic round 2): a round-bottom boiling flask with a crown stopper,
     so gold Legendary can never be mistaken for a yellow Light-catalyzed Erlenmeyer. */
  crown: ["....k..k..k.....", "....kSkSkSk.....", "....kSSSSSk.....", ".....kkkkk......", "......kwgk......", "......kwgk......", "......kwgk......", ".....kwgggk.....", "....kHHHHHHk....", "...kwLLLLLLLk...", "..kwLLLLLLLLLk..", ".kwLLLLLLLLLLLk.", ".kLLLLLLLLLLLLk.", ".kLLLLLLLLLLLLk.", ".kLLLLLLLLLLLLk.", ".kDLLLLLLLLLLDk.", "..kDLLLLLLLLDk..", "...kDDDDDDDDk...", "....kkkkkkkk....", "...kkkkkkkkkk..."],
  qmark: [".kkk.", "k...k", "....k", "..kk.", "..k..", ".....", "..k.."],
  tube: ["kkkkkk", ".kkkk.", ".kwgk.", ".kwgk.", ".kHHk.", ".kwLk.", ".kwLk.", ".kLLk.", ".kLLk.", ".kLLk.", ".kLLk.", ".kLLk.", ".kLLk.", ".kDLk.", ".kDDk.", "..kk.."],
  lampBase: [".....kk.....", "...kkkkkk...", "..kAaaaaAk..", ".kAaaaaaaAk.", ".kAaaaaaaAk.", "..kkkkkkkk.."],
  fA: ["......o.....", ".....oy.....", ".....oyo....", "....oyWyo...", "....oyWyo...", ".....oyo...."],
  fB: [".....o......", ".....oyo....", "....oyyo....", "....oyWyo...", "....oyWyo...", ".....oyo...."],
  fC: ["......o.....", "......yo....", ".....oyyo...", "....oyWyo...", "....oyWyo...", ".....oyo...."],
  alarmOn: ["..kkkk..", ".kUUUUk.", "kUWUUUUk", "kUUUUUUk", "kvvvvvvk", "kkkkkkkk"],
  alarmOff: ["..kkkk..", ".kuuuuk.", "kuuuuuuk", "kuuuuuuk", "kvvvvvvk", "kkkkkkkk"],
  i_heat: ["....kk....", "...kok....", "...kook...", "..kooyok..", "..koyyok..", ".kooyWyok.", ".koyWWyok.", ".koyWWyok.", "..koyyok..", "...kkkk..."],
  i_pressure: ["...kkkk...", ".kkPPPPkk.", ".kPffffPk.", "kPffffkfPk", "kPfffkffPk", "kPffkkffPk", "kPffffffPk", ".kPffffPk.", ".kkPPPPkk.", "...kkkk..."],
  i_light: ["....ZZ....", ".Z.kkkk.Z.", "..kSSSSk..", ".kSWWSSSk.", "ZkSWSSSSkZ", "ZkSSSSSSkZ", ".kSSSSSSk.", "..kSSSSk..", ".Z.kkkk.Z.", "....ZZ...."],
  i_electricity: [".....kkkk.", "....kEEk..", "...kEEk...", "..kEEkkkk.", ".kEEEEEEk.", ".kkkkEEk..", "....kEk...", "...kEk....", "..kEk.....", "..kk......"],
  i_enzyme: [".kk....kk.", ".kNk..knk.", "..kNkknk..", "...kNnk...", "...knNk...", "..knkkNk..", ".knk..kNk.", ".knk..kNk.", "..knkkNk..", "...kNnk..."],
  i_acid: ["....kk....", "....kk....", "...kQQk...", "...kQQk...", "..kQWQQk..", ".kQWQQQQk.", ".kQQQQQQk.", ".kQQQQqQk.", "..kQqqQk..", "...kkkk..."],
  i_mystery: [".kkkkkkkk.", "kppppppppk", "kppkkkkppk", "kpkppppkpk", "kppppppkpk", "kpppppkppk", "kppppkpppk", "kppppppppk", "kppppkpppk", ".kkkkkkkk."],
  sun: ["k..k..k", ".kSSSk.", "kSSWSSk", ".kSSSk.", "k..k..k"],
  /* Crescent moon (critic: the round-1 moon read as "C"/"G"); two stars make it unmistakably night. */
  moon: ["....F..", "..kk...", ".kFk..F", "kFFk...", "kFFFk..", ".kFFFkk", "..kkkk."],
  mini: ["..kk..", ".kwgk.", "kHHHHk", "kLLLLk", "kLLLLk", ".kkkk."],
  flame7: ["...k...", "..kok..", ".koyok.", ".koyok.", "koyWyok", "koyWyok", ".kkkkk."],
  star: ["...k...", "..kSk..", "kkSWSkk", "kSSSSSk", ".kSSSk.", "kSSkSSk", "kk...kk"],
  flake: ["...F...", ".F.F.F.", "..FFF..", "FFFjFFF", "..FFF..", ".F.F.F.", "...F..."],
  haz: ["kkkkkkk", "kYkYkYk", "kkYkYkk", "kYkYkYk", "kkkkkkk"],
  up: ["..k..", ".kNk.", "kNNNk"],
  dn: ["kQQQk", ".kQk.", "..k.."],
  smoke: ["...kkk....", "..ksssk...", ".ksssssk..", "ksssssssk.", ".ksssssssk", "..kssssk..", "...kkkk..."],
  qr: ["kkk.k.kkk", "k.k...k.k", "kkk.k.kkk", "....k....", "k.kk.kk.k", "....k....", "kkk..k.k.", "k.k.kk..k", "kkk.k.kk."],
  lock: [".kkkk.", "k....k", "k....k", "kkkkkk", "kppppk", "kpkkpk", "kppppk", "kkkkkk"],
  /* Nav icons (9×9, ink outline, filled at use with currentColor-like palettes). */
  n_lab: ["...kkk...", "...kgk...", "..kkkkk..", ".kwLLLLk.", ".kLlllLk.", ".kLlllLk.", ".kLLLLLk.", ".kDDDDDk.", "..kkkkk.."],
  n_mix: ["...kkk...", "...kgk...", "...kgk...", "..kwggk..", "..kLLLk..", ".kLLLLLk.", ".kLLLLLk.", "kDLLLLLDk", "kkkkkkkkk"],
  n_book: ["kkkkkkkk.", "kppppppkk", "kpkkkkpkk", "kppppppkk", "kpkkkppkk", "kppppppkk", "kpkkkkpkk", "kppppppkk", "kkkkkkkk."],
  n_crew: [".kk...kk.", "kppk.kppk", "kppk.kppk", ".kk...kk.", "...kkk...", ".kkpppkk.", "kpppppppk", "kpppppppk", "kkkkkkkkk"],
  n_help: [".kkkkkkk.", "kpppppppk", "kppkkkppk", "kpppppkpk", "kppppkppk", "kpppkpppk", "kpppppppk", "kpppkpppk", ".kkkkkkk."],
  envelope: ["kkkkkkkkkkkk", "kUpppppppppk", "kpUpppppppUk", "kppUpppppUpk", "kpppUkkkUppk", "kppppUUUpppk", "kppppppppppk", "kppppppppppk", "kkkkkkkkkkkk"],
} as const;

export type SpriteName = keyof typeof SPR;
export type ElementTier = "common" | "uncommon" | "rare" | "isotope";
export const TIER_SPRITE: Record<ElementTier, SpriteName> = { common: "jar", uncommon: "flask", rare: "decanter", isotope: "ampoule" };
export const PIPS: Record<string, number> = { common: 1, basic: 1, uncommon: 2, catalyzed: 2, rare: 3, isotope: 4, legendary: 5 };
export const CATALYSTS = ["heat", "pressure", "light", "electricity", "enzyme", "acid"] as const;
export type CatalystId = (typeof CATALYSTS)[number];
export const CAT_COLOR: Record<CatalystId, string> = {
  heat: "#ff5a36", pressure: "#a57bff", light: "#ffe14a", electricity: "#4db2ff", enzyme: "#4bf08b", acid: "#ff5fae",
};
export function isCatalyst(id: string | null | undefined): id is CatalystId {
  return !!id && (CATALYSTS as readonly string[]).includes(id);
}

export type Run = { x: number; y: number; w: number; ch: string; fill: string };

/** Row-run-length encode a sprite into rects (one per horizontal run of the same character). */
export function runs(rows: readonly string[], pal: Record<string, string> = {}, ox = 0, oy = 0): Run[] {
  const out: Run[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === ".") { x++; continue; }
      let e = x;
      while (e < row.length && row[e] === ch) e++;
      const fill = pal[ch] ?? P[ch];
      if (fill) out.push({ x: x + ox, y: y + oy, w: e - x, ch, fill });
      x = e;
    }
  });
  return out;
}

/** Ghost outline of a sprite (uncollected slot): keep only the ink, recolored. */
export function ghostRows(rows: readonly string[]): string[] {
  return rows.map((r) => r.replace(/[^k.]/g, "."));
}

export type HaloRect = { x: number; y: number; w: number; h: number; o: number };
/**
 * THE one glow generator: a stepped octagon built from q×q art-pixel blocks, two rings at 38% / 16%.
 * Never a CSS circle, radial-gradient or blur. Callers paint with a solid color and these opacities,
 * or pass `solid` colors to avoid muddy blends (story card).
 */
export function haloRects(r: number, q = 2): HaloRect[] {
  const out: HaloRect[] = [];
  const d = r * 2;
  const lv = (bx: number, by: number) => {
    const cx = Math.abs(bx + q / 2 - r), cy = Math.abs(by + q / 2 - r);
    const n = Math.max(cx, cy, (cx + cy) * 0.75);
    return n < r * 0.56 ? 0.38 : n < r ? 0.16 : 0;
  };
  for (let by = 0; by < d; by += q) {
    let bx = 0;
    while (bx < d) {
      const v = lv(bx, by);
      let e = bx;
      while (e < d && lv(e, by) === v) e += q;
      if (v) out.push({ x: bx, y: by, w: e - bx, h: q, o: v });
      bx = e;
    }
  }
  return out;
}

/** Mix a hex color toward a background by alpha → solid hex (used where translucent glows turn muddy). */
export function mixHex(fg: string, bg: string, a: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [f, b] = [p(fg), p(bg)];
  return "#" + f.map((v, i) => Math.round(v * a + b[i] * (1 - a)).toString(16).padStart(2, "0")).join("");
}

/** Lab number from the college ID (organizer decision): last 4 digits, e.g. F20240248 → "0248". */
export function labNo(studentId: string | null | undefined, fallbackId = ""): string {
  const digits = (studentId ?? "").replace(/\D/g, "");
  if (digits.length) return digits.slice(-4).padStart(4, "0");
  return fallbackId.replace(/-/g, "").slice(0, 4).toUpperCase() || "0000";
}

/** Liquid for a compound: catalyzed compounds wear their catalyst's color; others their tier. */
export function compoundLiquid(tier: string, catalyst?: string | null): Liquid {
  if (isCatalyst(catalyst)) return catalyst;
  if (tier === "legendary") return "legendary";
  if (tier === "isotope") return "isotope";
  if (tier === "rare") return "rare";
  if (tier === "uncommon") return "uncommon";
  return "common";
}
