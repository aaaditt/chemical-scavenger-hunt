/**
 * Validates a post-login `next` path so it can only point back into this site.
 * Rejects protocol-relative (`//x`), backslash tricks (`/\x` is parsed as `//x`), control characters,
 * and anything whose resolved origin differs from ours.
 */
export function safeNextPath(raw: string | null | undefined, fallback = "/lab"): string {
  if (!raw || !/^\/(?![/\\])/.test(raw) || /[\\\x00-\x1f]/.test(raw)) return fallback;
  try {
    const base = "https://same.origin.invalid";
    const u = new URL(raw, base);
    if (u.origin !== base) return fallback;
    // Validate the NORMALIZED result too: "/.//evil.com" and "/a/..//evil.com" normalize to "//evil.com".
    const out = u.pathname + u.search + u.hash;
    return out.startsWith("/") && !out.startsWith("//") && !out.startsWith("/\\") ? out : fallback;
  } catch {
    return fallback;
  }
}
