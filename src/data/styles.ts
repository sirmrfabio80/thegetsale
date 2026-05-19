import type { StylePreference } from "./setupStorage";

export const STYLE_OPTIONS: ReadonlyArray<{
  value: StylePreference;
  description: string;
}> = [
  { value: "Quiet luxury", description: "Hushed, archival, considered." },
  { value: "Statement", description: "Bold cuts, runway-led drama." },
  { value: "Editorial", description: "Magazine-ready, fashion-forward." },
  { value: "Heritage", description: "Houses with deep histories." },
  { value: "Street", description: "Off-runway, downtown energy." },
  { value: "Contemporary", description: "Modern, wearable, daily." },
];

// Keywords used to score brand taglines against a chosen style.
const STYLE_KEYWORDS: Record<StylePreference, string[]> = {
  "Quiet luxury": ["quiet", "archival", "tailoring", "considered", "hush"],
  Statement: ["bold", "runway", "statement", "dramatic"],
  Editorial: ["editorial", "magazine", "fashion", "forward"],
  Heritage: ["heritage", "house", "atelier", "maison", "archive"],
  Street: ["street", "downtown", "casual", "sport"],
  Contemporary: ["contemporary", "modern", "daily", "wearable", "ready-to-wear"],
};

export function styleScore(
  tagline: string,
  styles: StylePreference[] | undefined,
): number {
  if (!styles || styles.length === 0) return 0;
  const t = tagline.toLowerCase();
  let score = 0;
  for (const s of styles) {
    for (const kw of STYLE_KEYWORDS[s]) {
      if (t.includes(kw)) score += 1;
    }
  }
  return score;
}
