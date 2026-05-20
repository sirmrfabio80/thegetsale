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

/**
 * Resolve a raw redirect query value into a typed navigation target.
 * Known routes (like /brand/:id) are returned with their typed params so
 * callers can pass them straight into TanStack `navigate(...)`.
 */
export type ResolvedRedirect =
  | { kind: "brand"; id: string }
  | { kind: "path"; to: string };

export function resolveRedirect(
  input: unknown,
  fallback = "/dashboard",
): ResolvedRedirect {
  const safe = safeRedirect(input, fallback);
  const brandMatch = safe.match(/^\/brand\/([^/?#]+)$/);
  if (brandMatch) {
    return { kind: "brand", id: brandMatch[1] };
  }
  return { kind: "path", to: safe };
}
