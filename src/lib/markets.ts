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

export const MARKETS: { code: MarketCode; label: string }[] = [
  { code: "us", label: "United States" },
  { code: "gb", label: "United Kingdom" },
  { code: "fr", label: "France" },
  { code: "de", label: "Germany" },
  { code: "it", label: "Italy" },
  { code: "es", label: "Spain" },
  { code: "nl", label: "Netherlands" },
  { code: "se", label: "Sweden" },
  { code: "dk", label: "Denmark" },
  { code: "au", label: "Australia" },
  { code: "ca", label: "Canada" },
  { code: "jp", label: "Japan" },
];

const MARKET_LABEL = new Map<string, string>(MARKETS.map((m) => [m.code, m.label]));

export function marketLabel(code: string | null | undefined): string {
  if (!code) return "Global";
  return MARKET_LABEL.get(code) ?? code.toUpperCase();
}
