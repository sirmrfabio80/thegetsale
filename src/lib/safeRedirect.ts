/**
 * Validate a redirect path to prevent open-redirect attacks.
 * Only allows same-origin, absolute paths like "/dashboard" or "/brand/123".
 * Rejects protocol-relative ("//evil.com"), absolute URLs, and anything not starting with "/".
 */
export function safeRedirect(input: unknown, fallback = "/dashboard"): string {
  if (typeof input !== "string") return fallback;
  const value = input.trim();
  if (value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.startsWith("/\\")) return fallback;
  return value;
}
