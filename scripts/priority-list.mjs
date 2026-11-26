// Validates content/catalog.json and regenerates docs/content/priority-list.md.
// Usage: node scripts/priority-list.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(resolve(root, "content/catalog.json"), "utf8"));

const errors = [];
const elements = new Map(catalog.elements.map((e) => [e.symbol, e]));
const catalysts = new Map(catalog.catalysts.map((c) => [c.id, c]));
const tierRank = Object.fromEntries(catalog.compoundTiers.map((t, i) => [t, i]));
const elementTierRank = { common: 0, uncommon: 1, rare: 2, isotope: 3 };

if (elements.size !== catalog.elements.length) errors.push("Duplicate element symbols");
for (const e of catalog.elements) {
  if (!(e.tier in catalog.tiers)) errors.push(`Element ${e.symbol}: unknown tier ${e.tier}`);
}

const ids = new Set();
const recipeKeys = new Map();
for (const c of catalog.compounds) {
  if (ids.has(c.id)) errors.push(`Duplicate compound id ${c.id}`);
  ids.add(c.id);
  if (!(c.tier in tierRank)) errors.push(`${c.id}: unknown tier ${c.tier}`);
  if (c.catalyst && !catalysts.has(c.catalyst)) errors.push(`${c.id}: unknown catalyst ${c.catalyst}`);
  if (c.catalyst && !c.lockedHint) errors.push(`${c.id}: catalyst-gated but no lockedHint`);
  for (const [sym, qty] of Object.entries(c.recipe)) {
    if (!elements.has(sym)) errors.push(`${c.id}: unknown element ${sym}`);
    if (!Number.isInteger(qty) || qty < 1) errors.push(`${c.id}: bad quantity ${sym}=${qty}`);
  }
  // Two compounds must never share the same recipe + catalyst, or the mix bench is ambiguous.
  const key = Object.entries(c.recipe).sort().map(([s, q]) => `${s}${q}`).join("") + "|" + (c.catalyst ?? "");
  if (recipeKeys.has(key)) errors.push(`${c.id}: same recipe as ${recipeKeys.get(key)}`);
  recipeKeys.set(key, c.id);
}

if (errors.length) {
  console.error("Catalog errors:\n- " + errors.join("\n- "));
  process.exit(1);
}

const rarest = (c) =>
  Math.max(...Object.keys(c.recipe).map((s) => elementTierRank[elements.get(s).tier]));
const rarestLabel = (c) => ["common", "uncommon", "rare", "isotope"][rarest(c)];

const sorted = [...catalog.compounds].sort(
  (a, b) => b.points - a.points || tierRank[b.tier] - tierRank[a.tier] || a.name.localeCompare(b.name)
);

const fmtRecipe = (r) => Object.entries(r).map(([s, q]) => (q > 1 ? `${s}×${q}` : s)).join(" + ");
const cat = (id) => (id ? `${catalysts.get(id).emoji} ${catalysts.get(id).name}` : "—");

const byTier = {};
for (const c of catalog.compounds) byTier[c.tier] = (byTier[c.tier] ?? 0) + 1;
const byCatalyst = {};
for (const c of catalog.compounds) if (c.catalyst) byCatalyst[c.catalyst] = (byCatalyst[c.catalyst] ?? 0) + 1;

let md = `# Compound Priority List\n\n`;
md += `> Generated from \`content/catalog.json\` by \`node scripts/priority-list.mjs\`. Don't edit by hand.\n\n`;
md += `**${catalog.elements.length} elements · ${catalog.catalysts.length} catalysts · ${catalog.compounds.length} compounds**\n\n`;
md += `Compounds per tier: ${catalog.compoundTiers.map((t) => `${t} ${byTier[t] ?? 0}`).join(" · ")}\n\n`;
md += `Compounds per catalyst: ${catalog.catalysts.map((c) => `${c.emoji} ${c.name} ${byCatalyst[c.id] ?? 0}`).join(" · ")}\n\n`;
md += `## Elements\n\n| Symbol | Name | Tier | Scan pts | Giftable |\n|---|---|---|---|---|\n`;
for (const e of catalog.elements) {
  md += `| ${e.symbol} | ${e.name} | ${e.tier} | ${catalog.tiers[e.tier].elementPoints} | ${e.giftable ? "yes" : ""} |\n`;
}
md += `\n## Compounds (highest priority first)\n\n| # | Compound | Formula | Recipe | Catalyst | Tier | Rarest input | Points |\n|---|---|---|---|---|---|---|---|\n`;
sorted.forEach((c, i) => {
  md += `| ${i + 1} | ${c.name} | ${c.formula} | ${fmtRecipe(c.recipe)} | ${cat(c.catalyst)} | ${c.tier} | ${rarestLabel(c)} | ${c.points} |\n`;
});

const out = resolve(root, "docs/content/priority-list.md");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, md);
console.log(`OK: ${catalog.compounds.length} compounds validated → docs/content/priority-list.md`);
