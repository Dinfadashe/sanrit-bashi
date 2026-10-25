/**
 * Only ever redirect to a path on THIS site. A `next` value comes straight
 * from the URL, so it is attacker-controllable: without this check, a link
 * like /auth/callback?code=...&next=@evil.com would build
 * "https://ourdomain.com@evil.com" — which browsers treat as a login to
 * evil.com — and send a freshly signed-in user there (a classic phishing
 * setup). Accept only a single-slash relative path.
 */
export function safeNextPath(raw: string | null, origin: string): string {
  const fallback = "/dashboard";
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (/[\r\n\\]/.test(raw)) return fallback;

  try {
    const resolved = new URL(raw, origin);
    if (resolved.origin !== origin) return fallback;
    return `${resolved.pathname}${resolved.search}`;
  } catch {
    return fallback;
  }
}
