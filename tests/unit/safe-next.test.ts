import { describe, expect, it } from "vitest";
import { safeNextPath } from "../../src/lib/safe-next";

describe("safeNextPath", () => {
  it.each(["/lab", "/s/DEV-H", "/mix?cat=ABC123", "/admin#x"])("allows %s", (p) => expect(safeNextPath(p)).toBe(p));

  const attacks = [
    null,
    "",
    "lab",
    "//evil.com",
    String.raw`/\evil.com`, // browsers parse "\" as "/", so this is //evil.com
    String.raw`/\/evil.com`,
    String.raw`\\evil.com`,
    "https://evil.com",
    "/\tx",
    "/\nx",
  ];
  it.each(attacks)("rejects %j", (p) => expect(safeNextPath(p)).toBe("/lab"));

  it("keeps encoded characters as a same-origin path (harmless)", () => {
    expect(safeNextPath("/%0d%0a")).toBe("/%0d%0a");
  });
});
