// Curated list of markets for sale events. Lowercase ISO-3166-1 alpha-2,
// matching brand_links.country_code. `null` represents a global / unspecified
// sale (the default for legacy rows and worldwide promotions).

export type MarketCode =
  | "us"
  | "gb"
  | "fr"
  | "de"
  | "it"
  | "es"
  | "nl"
  | "se"
  | "dk"
  | "au"
  | "ca"
  | "jp";

export type MarketEntry = { code: MarketCode; label: string; flag: string };

export const MARKETS: MarketEntry[] = [
  { code: "us", label: "United States", flag: "🇺🇸" },
  { code: "gb", label: "United Kingdom", flag: "🇬🇧" },
  { code: "fr", label: "France", flag: "🇫🇷" },
  { code: "de", label: "Germany", flag: "🇩🇪" },
  { code: "it", label: "Italy", flag: "🇮🇹" },
  { code: "es", label: "Spain", flag: "🇪🇸" },
  { code: "nl", label: "Netherlands", flag: "🇳🇱" },
  { code: "se", label: "Sweden", flag: "🇸🇪" },
  { code: "dk", label: "Denmark", flag: "🇩🇰" },
  { code: "au", label: "Australia", flag: "🇦🇺" },
  { code: "ca", label: "Canada", flag: "🇨🇦" },
  { code: "jp", label: "Japan", flag: "🇯🇵" },
];

const MARKET_LABEL = new Map<string, string>(MARKETS.map((m) => [m.code, m.label]));
const MARKET_CODES = new Set<string>(MARKETS.map((m) => m.code));

export function marketLabel(code: string | null | undefined): string {
  if (!code) return "Global";
  return MARKET_LABEL.get(code) ?? code.toUpperCase();
}

export function isMarketCode(code: string | null | undefined): code is MarketCode {
  return !!code && MARKET_CODES.has(code);
}
