/**
 * Single source of truth for every themeable design token.
 *
 * Each entry drives:
 *  - The CSS defaults injected when the DB has no value.
 *  - The admin Design form (label, description, group, input type).
 *  - Validation when writing tokens back to the DB.
 *
 * Adding a token here makes it appear in the admin form automatically and
 * become overridable per theme. Keep `default` in sync with the Editorial
 * seed in the themes migration — both must mirror the values in
 * `src/styles.css` so the active Editorial theme is byte-for-byte identical
 * to the static fallback.
 */
export type ThemeTokenGroup =
  | "Color"
  | "Typography"
  | "Shape & Borders"
  | "Shadows"
  | "Labels & Motion";

export type ThemeTokenType = "color" | "font" | "length" | "select" | "shadow";

export interface ThemeTokenDef {
  /** Stable key — same as the CSS variable name. */
  key: string;
  /** The CSS custom property emitted into `:root`. */
  cssVar: string;
  /** Human label for the admin form. */
  label: string;
  /** Helper text explaining what the variable controls. */
  description: string;
  group: ThemeTokenGroup;
  type: ThemeTokenType;
  /** Default value when no DB override exists. Must mirror `src/styles.css`. */
  default: string;
  /** Options for `select` inputs. */
  options?: { value: string; label: string }[];
}

export const THEME_REGISTRY: ThemeTokenDef[] = [
  // ─── Color ────────────────────────────────────────────────────────────────
  {
    key: "--background",
    cssVar: "--background",
    label: "Background",
    description: "Page background colour. Warm off-white in Editorial.",
    group: "Color",
    type: "color",
    default: "oklch(0.975 0.008 80)",
  },
  {
    key: "--foreground",
    cssVar: "--foreground",
    label: "Foreground",
    description: "Default text colour against the background.",
    group: "Color",
    type: "color",
    default: "oklch(0.19 0.015 65)",
  },
  {
    key: "--card",
    cssVar: "--card",
    label: "Card surface",
    description: "Background of cards and elevated surfaces.",
    group: "Color",
    type: "color",
    default: "oklch(0.99 0.006 80)",
  },
  {
    key: "--card-foreground",
    cssVar: "--card-foreground",
    label: "Card foreground",
    description: "Text colour inside cards.",
    group: "Color",
    type: "color",
    default: "oklch(0.19 0.015 65)",
  },
  {
    key: "--popover",
    cssVar: "--popover",
    label: "Popover surface",
    description: "Background of dropdowns and popovers.",
    group: "Color",
    type: "color",
    default: "oklch(0.99 0.006 80)",
  },
  {
    key: "--popover-foreground",
    cssVar: "--popover-foreground",
    label: "Popover foreground",
    description: "Text colour inside popovers.",
    group: "Color",
    type: "color",
    default: "oklch(0.19 0.015 65)",
  },
  {
    key: "--primary",
    cssVar: "--primary",
    label: "Primary",
    description: "Primary brand colour — solid buttons, key accents.",
    group: "Color",
    type: "color",
    default: "oklch(0.19 0.015 65)",
  },
  {
    key: "--primary-foreground",
    cssVar: "--primary-foreground",
    label: "Primary foreground",
    description: "Text on top of the primary colour.",
    group: "Color",
    type: "color",
    default: "oklch(0.975 0.008 80)",
  },
  {
    key: "--secondary",
    cssVar: "--secondary",
    label: "Secondary",
    description: "Secondary surface — quiet buttons, chips.",
    group: "Color",
    type: "color",
    default: "oklch(0.94 0.01 75)",
  },
  {
    key: "--secondary-foreground",
    cssVar: "--secondary-foreground",
    label: "Secondary foreground",
    description: "Text on top of secondary surfaces.",
    group: "Color",
    type: "color",
    default: "oklch(0.19 0.015 65)",
  },
  {
    key: "--muted",
    cssVar: "--muted",
    label: "Muted",
    description: "Muted background tint.",
    group: "Color",
    type: "color",
    default: "oklch(0.94 0.01 75)",
  },
  {
    key: "--muted-foreground",
    cssVar: "--muted-foreground",
    label: "Muted foreground",
    description: "Subdued text — captions, helper copy.",
    group: "Color",
    type: "color",
    default: "oklch(0.48 0.02 65)",
  },
  {
    key: "--accent",
    cssVar: "--accent",
    label: "Accent",
    description: "Editorial accent colour — warm ochre in Editorial.",
    group: "Color",
    type: "color",
    default: "oklch(0.72 0.055 68)",
  },
  {
    key: "--accent-foreground",
    cssVar: "--accent-foreground",
    label: "Accent foreground",
    description: "Text on top of accent surfaces.",
    group: "Color",
    type: "color",
    default: "oklch(0.19 0.015 65)",
  },
  {
    key: "--destructive",
    cssVar: "--destructive",
    label: "Destructive",
    description: "Destructive actions — delete, irreversible warnings.",
    group: "Color",
    type: "color",
    default: "oklch(0.55 0.18 28)",
  },
  {
    key: "--destructive-foreground",
    cssVar: "--destructive-foreground",
    label: "Destructive foreground",
    description: "Text on destructive surfaces.",
    group: "Color",
    type: "color",
    default: "oklch(0.975 0.008 80)",
  },
  {
    key: "--border",
    cssVar: "--border",
    label: "Border",
    description: "Hairline borders across cards, dividers, inputs.",
    group: "Color",
    type: "color",
    default: "oklch(0.88 0.012 75)",
  },
  {
    key: "--input",
    cssVar: "--input",
    label: "Input border",
    description: "Border colour on form controls.",
    group: "Color",
    type: "color",
    default: "oklch(0.88 0.012 75)",
  },
  {
    key: "--ring",
    cssVar: "--ring",
    label: "Focus ring",
    description: "Keyboard focus outline colour.",
    group: "Color",
    type: "color",
    default: "oklch(0.55 0.04 70)",
  },
  {
    key: "--signal-soon",
    cssVar: "--signal-soon",
    label: "Signal — Wait for sale",
    description: "Colour for the “Wait for sale” recommendation.",
    group: "Color",
    type: "color",
    default: "oklch(0.55 0.10 70)",
  },
  {
    key: "--signal-hold",
    cssVar: "--signal-hold",
    label: "Signal — Hold",
    description: "Colour for the “Hold” recommendation.",
    group: "Color",
    type: "color",
    default: "oklch(0.48 0.045 250)",
  },
  {
    key: "--signal-buy",
    cssVar: "--signal-buy",
    label: "Signal — Buy now",
    description: "Colour for the “Buy now” recommendation.",
    group: "Color",
    type: "color",
    default: "oklch(0.42 0.09 145)",
  },
  {
    key: "--signal-low",
    cssVar: "--signal-low",
    label: "Signal — No clear read",
    description: "Colour for the awaiting / low-confidence state.",
    group: "Color",
    type: "color",
    default: "oklch(0.60 0.008 75)",
  },
  {
    key: "--signal-soon-wash",
    cssVar: "--signal-soon-wash",
    label: "Wash — Wait for sale",
    description: "Soft tinted wash behind the Wait for sale badge.",
    group: "Color",
    type: "color",
    default: "oklch(0.965 0.028 75)",
  },
  {
    key: "--signal-hold-wash",
    cssVar: "--signal-hold-wash",
    label: "Wash — Hold",
    description: "Soft tinted wash behind the Hold badge.",
    group: "Color",
    type: "color",
    default: "oklch(0.96 0.012 240)",
  },
  {
    key: "--signal-buy-wash",
    cssVar: "--signal-buy-wash",
    label: "Wash — Buy now",
    description: "Soft tinted wash behind the Buy now badge.",
    group: "Color",
    type: "color",
    default: "oklch(0.96 0.025 140)",
  },

  // ─── Typography ───────────────────────────────────────────────────────────
  {
    key: "--font-serif",
    cssVar: "--font-serif",
    label: "Serif family",
    description: "Display/serif stack used for headlines.",
    group: "Typography",
    type: "font",
    default: '"Instrument Serif", ui-serif, Georgia, serif',
  },
  {
    key: "--font-sans",
    cssVar: "--font-sans",
    label: "Sans family",
    description: "Default sans-serif stack for body copy and UI.",
    group: "Typography",
    type: "font",
    default: '"Inter", ui-sans-serif, system-ui, sans-serif',
  },

  // ─── Shape & Borders ──────────────────────────────────────────────────────
  {
    key: "--radius",
    cssVar: "--radius",
    label: "Base radius",
    description: "Legacy shadcn radius — kept for compatibility.",
    group: "Shape & Borders",
    type: "length",
    default: "0.25rem",
  },
  {
    key: "--radius-card",
    cssVar: "--radius-card",
    label: "Card radius",
    description: "Corner radius on cards (CardBase).",
    group: "Shape & Borders",
    type: "length",
    default: "0",
  },
  {
    key: "--radius-button",
    cssVar: "--radius-button",
    label: "Button radius",
    description: "Corner radius on buttons and tab triggers.",
    group: "Shape & Borders",
    type: "length",
    default: "0",
  },
  {
    key: "--radius-badge",
    cssVar: "--radius-badge",
    label: "Badge radius",
    description: "Corner radius on signal badges and chips.",
    group: "Shape & Borders",
    type: "length",
    default: "0",
  },
  {
    key: "--border-width",
    cssVar: "--border-width",
    label: "Border width",
    description: "Hairline weight used across the system.",
    group: "Shape & Borders",
    type: "length",
    default: "1px",
  },

  // ─── Shadows ──────────────────────────────────────────────────────────────
  {
    key: "--shadow-1",
    cssVar: "--shadow-1",
    label: "Shadow 1 (hairline)",
    description: "Subtlest elevation — used to settle a surface above the page.",
    group: "Shadows",
    type: "shadow",
    default: "0 1px 0 0 oklch(0 0 0 / 0.04)",
  },
  {
    key: "--shadow-2",
    cssVar: "--shadow-2",
    label: "Shadow 2 (hover)",
    description: "Card hover elevation.",
    group: "Shadows",
    type: "shadow",
    default: "0 2px 12px -6px oklch(0 0 0 / 0.08)",
  },
  {
    key: "--shadow-3",
    cssVar: "--shadow-3",
    label: "Shadow 3 (modal)",
    description: "Heavier elevation for modals and popovers.",
    group: "Shadows",
    type: "shadow",
    default: "0 12px 40px -16px oklch(0 0 0 / 0.12)",
  },

  // ─── Labels & Motion ──────────────────────────────────────────────────────
  {
    key: "--label-transform",
    cssVar: "--label-transform",
    label: "Eyebrow case",
    description: "Whether eyebrow labels are uppercase or sentence case.",
    group: "Labels & Motion",
    type: "select",
    default: "uppercase",
    options: [
      { value: "uppercase", label: "UPPERCASE" },
      { value: "none", label: "Sentence case" },
    ],
  },
  {
    key: "--label-tracking",
    cssVar: "--label-tracking",
    label: "Eyebrow tracking",
    description: "Letter-spacing applied to eyebrow labels.",
    group: "Labels & Motion",
    type: "length",
    default: "0.18em",
  },
];

export const THEME_REGISTRY_BY_KEY: Record<string, ThemeTokenDef> = Object.fromEntries(
  THEME_REGISTRY.map((t) => [t.key, t]),
);

export const THEME_GROUPS_ORDER: ThemeTokenGroup[] = [
  "Color",
  "Typography",
  "Shape & Borders",
  "Shadows",
  "Labels & Motion",
];

/** Defaults as a flat `{ "--var": "value" }` object. */
export function defaultTokens(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of THEME_REGISTRY) out[t.key] = t.default;
  return out;
}

/**
 * Per-theme seeded overrides — the values shipped in the themes migration.
 * Editorial uses the registry defaults verbatim; other themes only list the
 * tokens they override. Keep these in sync with the seed migration.
 */
export const SEEDED_THEME_OVERRIDES: Record<string, Record<string, string>> = {
  editorial: {},
  playful: {
    "--radius": "0.75rem",
    "--background": "oklch(0.985 0.012 95)",
    "--foreground": "oklch(0.22 0.04 285)",
    "--card": "oklch(1 0 0)",
    "--card-foreground": "oklch(0.22 0.04 285)",
    "--popover": "oklch(1 0 0)",
    "--popover-foreground": "oklch(0.22 0.04 285)",
    "--primary": "oklch(0.58 0.22 295)",
    "--primary-foreground": "oklch(0.985 0.012 95)",
    "--secondary": "oklch(0.93 0.05 95)",
    "--secondary-foreground": "oklch(0.22 0.04 285)",
    "--muted": "oklch(0.95 0.025 95)",
    "--muted-foreground": "oklch(0.45 0.04 285)",
    "--accent": "oklch(0.78 0.16 55)",
    "--accent-foreground": "oklch(0.22 0.04 285)",
    "--destructive": "oklch(0.62 0.22 25)",
    "--destructive-foreground": "oklch(0.985 0.012 95)",
    "--border": "oklch(0.88 0.03 285)",
    "--input": "oklch(0.88 0.03 285)",
    "--ring": "oklch(0.58 0.22 295)",
    "--signal-soon": "oklch(0.68 0.18 55)",
    "--signal-hold": "oklch(0.58 0.16 250)",
    "--signal-buy": "oklch(0.62 0.18 145)",
    "--signal-low": "oklch(0.65 0.02 285)",
    "--signal-soon-wash": "oklch(0.96 0.05 55)",
    "--signal-hold-wash": "oklch(0.96 0.04 250)",
    "--signal-buy-wash": "oklch(0.96 0.05 145)",
    "--shadow-1": "0 1px 2px 0 oklch(0 0 0 / 0.06)",
    "--shadow-2": "0 8px 24px -8px oklch(0 0 0 / 0.14)",
    "--shadow-3": "0 24px 60px -20px oklch(0 0 0 / 0.20)",
    "--radius-card": "1rem",
    "--radius-button": "9999px",
    "--radius-badge": "9999px",
    "--label-transform": "none",
    "--label-tracking": "0",
  },
};

/**
 * Seeded defaults for a given theme key. Falls back to registry defaults for
 * tokens the seed doesn't override (and for unknown themes, e.g. duplicates).
 */
export function seededDefaultsFor(themeKey: string): Record<string, string> {
  const overrides = SEEDED_THEME_OVERRIDES[themeKey] ?? {};
  const out: Record<string, string> = {};
  for (const t of THEME_REGISTRY) out[t.key] = overrides[t.key] ?? t.default;
  return out;
}

