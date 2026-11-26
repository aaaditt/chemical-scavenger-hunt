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
    return u.origin === base ? u.pathname + u.search + u.hash : fallback;
  } catch {
    return fallback;
  }
}
