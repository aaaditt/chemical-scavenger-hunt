import { describe, expect, it } from "vitest";
import { displaySymbol, formatRecipe, parseScan, recipeKey } from "../../src/lib/game";

describe("game helpers", () => {
  it("recipeKey matches SQL recipe_key ordering", () => {
    expect(recipeKey({ O: 1, H: 2 })).toBe("H:2,O:1");
    expect(recipeKey({ Na: 1, H: 1, C: 1, O: 3 })).toBe("C:1,H:1,Na:1,O:3");
  });
  it("displays isotope symbols with superscripts", () => {
    expect(displaySymbol("C14")).toBe("¹⁴C");
    expect(displaySymbol("U235")).toBe("²³⁵U");
    expect(displaySymbol("Na")).toBe("Na");
  });
  it("formats recipes", () => expect(formatRecipe({ H: 2, O: 1 })).toBe("H×2 + O"));
  it("parses scans", () => {
    expect(parseScan("https://x.app/s/ABCDEF1234")).toEqual({ kind: "qr", code: "ABCDEF1234" });
    expect(parseScan("https://x.app/g/GIFT1234")).toEqual({ kind: "gift", code: "GIFT1234" });
    expect(parseScan("https://x.app/mix?cat=QWE234")).toEqual({ kind: "catalyst", code: "QWE234" });
    expect(parseScan("https://x.app/join/ALLY22")).toEqual({ kind: "alliance", code: "ALLY22" });
    expect(parseScan("DEV-H")).toEqual({ kind: "qr", code: "DEV-H" });
    expect(parseScan("https://evil.com/other")).toBeNull();
  });
});
