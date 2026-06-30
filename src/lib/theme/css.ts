import { THEME_REGISTRY, THEME_REGISTRY_BY_KEY, defaultTokens } from "./registry";

/**
 * Strip characters that could break out of a CSS declaration. Only registry
 * keys are emitted, but values can come from the DB so we sanitise.
 */
function sanitizeValue(value: string): string {
  return value.replace(/[;}<>]/g, "").trim();
}

/**
 * Build the `:root{ ... }` declaration block that is injected into <head>.
 * Missing keys fall back to registry defaults so the cascade always resolves.
 * Unknown keys in `tokens` are ignored.
 */
export function tokensToCss(tokens: Record<string, string> | null | undefined): string {
  const merged = { ...defaultTokens(), ...(tokens ?? {}) };
  const declarations: string[] = [];
  for (const def of THEME_REGISTRY) {
    const raw = merged[def.key];
    if (raw == null || raw === "") continue;
    const value = sanitizeValue(String(raw));
    if (!value) continue;
    declarations.push(`${def.cssVar}:${value}`);
  }
  return `:root{${declarations.join(";")}}`;
}

/**
 * Validate a token payload from the admin form: keep only registered keys
 * and trim values. Throws on empty strings for declared keys.
 */
export function sanitizeTokens(
  tokens: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(tokens)) {
    if (!(key in THEME_REGISTRY_BY_KEY)) continue;
    if (raw == null) continue;
    const value = String(raw).trim();
    if (!value) continue;
    out[key] = value;
  }
  return out;
}
