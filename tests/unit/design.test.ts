import { describe, expect, it } from "vitest";
import { SPR, compoundLiquid, haloRects, labNo, mixHex, runs } from "../../src/lib/sprites";
import { fitHero } from "../../src/components/Hero";
import { cleanFeed } from "../../src/components/Leaderboard";

describe("lab number (organizer decision: from the college ID)", () => {
  it("takes the last 4 digits, mirroring SQL _lab_no", () => {
    expect(labNo("F20240248")).toBe("0248");
    expect(labNo("H20231234P")).toBe("1234");
  });
  it("falls back to the player id when there is no college ID", () => {
    expect(labNo(null, "3f2a9c00-0000-0000-0000-000000000000")).toBe("3F2A");
  });
});

describe("hero name auto-fit (critic round 2: 64/48/40/32)", () => {
  it("keeps short names at 64px on one line", () => {
    expect(fitHero("Silver")).toEqual({ size: 64, lines: ["SILVER"] });
  });
  it("wraps two-word compounds at the space before shrinking below 40", () => {
    const r = fitHero("Carbon Dioxide");
    expect(r.lines).toEqual(["CARBON", "DIOXIDE"]);
    expect(r.size).toBeGreaterThanOrEqual(40);
  });
  it("never exceeds the phone width", () => {
    for (const n of ["Hydrogen Peroxide", "Sodium Bicarbonate", "Acetylsalicylic Acid", "Deuterium"]) {
      const { size, lines } = fitHero(n);
      expect(Math.max(...lines.map((l) => l.length)) * size * 0.74).toBeLessThanOrEqual(358);
    }
  });
});

describe("sprites", () => {
  it("every sprite row in a sprite has the same width", () => {
    for (const [name, rows] of Object.entries(SPR)) {
      expect(new Set(rows.map((r) => r.length)).size, name).toBe(1);
    }
  });
  it("run-length encodes rows", () => {
    expect(runs(["kk.k"], { k: "#000000" })).toEqual([
      { x: 0, y: 0, w: 2, ch: "k", fill: "#000000" },
      { x: 3, y: 0, w: 1, ch: "k", fill: "#000000" },
    ]);
  });
  it("halo is a stepped octagon: whole-block rects, two opacity rings only", () => {
    const h = haloRects(20, 2);
    expect(h.length).toBeGreaterThan(0);
    expect(new Set(h.map((r) => r.o))).toEqual(new Set([0.38, 0.16]));
    expect(h.every((r) => r.x % 2 === 0 && r.y % 2 === 0)).toBe(true);
  });
  it("mixHex pre-mixes glow colors into solids", () => {
    expect(mixHex("#ffffff", "#000000", 0.5)).toBe("#808080");
  });
  it("catalyzed compounds wear their catalyst's liquid on private screens", () => {
    expect(compoundLiquid("catalyzed", "pressure")).toBe("pressure");
    expect(compoundLiquid("legendary", null)).toBe("legendary");
    expect(compoundLiquid("basic", null)).toBe("common");
  });
});

describe("feed lines", () => {
  it("strips the old skin's emoji", () => {
    expect(cleanFeed("🕶️ The BLACK MARKET is open")).toBe("The BLACK MARKET is open");
    expect(cleanFeed("Aisha betrayed \"Fumes\" 🗡️")).toBe('Aisha betrayed "Fumes"');
  });
});
