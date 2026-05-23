// Resolves the best brand URL for a given user locale.
// Prefers a `brand_links` country-code match, else falls back to
// the canonical `website_url`. Returns null when neither exists.

import type { BrandLink } from "@/data/types";

export function userCountryCode(): string | null {
  if (typeof navigator === "undefined") return null;
  const langs: string[] = [];
  if (navigator.language) langs.push(navigator.language);
  if (Array.isArray(navigator.languages)) langs.push(...navigator.languages);
  for (const tag of langs) {
    // Tag shapes: "en-US", "fr-FR", "en", "zh-Hant-HK".
    const parts = tag.split("-");
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p && p.length === 2 && /^[A-Za-z]{2}$/.test(p)) {
        return p.toLowerCase();
      }
    }
  }
  return null;
}

export function resolveBrandUrl(
  websiteUrl: string | null | undefined,
  links: BrandLink[] | undefined,
  countryCode?: string | null,
): string | null {
  const code = (countryCode ?? userCountryCode())?.toLowerCase() ?? null;
  if (code && links && links.length > 0) {
    const match = links.find((l) => l.countryCode === code);
    if (match) return match.url;
  }
  return websiteUrl ?? null;
}
