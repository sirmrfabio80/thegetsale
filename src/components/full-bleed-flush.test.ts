import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Structural visual regression check: the sticky header must stay opaque
 * and the marketing hero + dashboard editorial band must remain full-bleed
 * so they sit flush under the header at every common viewport width
 * (390 iPhone, 768 tablet, 1024 laptop, 1280 desktop, 1536 wide).
 *
 * We don't run a real browser here (see brand.$id.test.ts for the same
 * pattern), so we assert the invariants that guarantee the flush layout:
 *
 *   1. Every sticky header uses SOLID `bg-background` — never
 *      `bg-background/NN` or `backdrop-blur`, which would let the video
 *      behind bleed through and read as "overlap".
 *   2. `FullBleedSection` keeps the viewport-breakout classes
 *      (`left-1/2 right-1/2 -mx-[50vw] w-screen`) so it escapes its
 *      parent's horizontal padding on every width.
 *   3. `Hero` and `EditorialBand` render through `VideoBanner` (which
 *      wraps `FullBleedSection`) — nobody swaps them for a padded shell.
 *   4. `VideoBanner` itself renders a `<FullBleedSection>` and never
 *      introduces its own horizontal padding.
 *
 * If any of these regress, the header or bands will visually clip or gap
 * at some breakpoint.
 */

const read = (p: string) => readFileSync(resolve(__dirname, "..", "..", p), "utf8");

// 1. Sticky headers must be solid.
const HEADER_FILES = [
  "src/components/PageLayout.tsx",
  "src/components/marketing/MarketingNav.tsx",
  "src/routes/_authenticated.tsx",
];

// Matches any `<header ...>` element that includes `sticky` in its className.
const STICKY_HEADER_RE = /<header\s+className="([^"]*sticky[^"]*)"/g;

describe("sticky header stays opaque so bands sit flush", () => {
  for (const file of HEADER_FILES) {
    it(`${file}: every sticky <header> uses solid bg-background`, () => {
      const src = read(file);
      const matches = [...src.matchAll(STICKY_HEADER_RE)];
      expect(matches.length, `no sticky header found in ${file}`).toBeGreaterThan(0);
      for (const m of matches) {
        const cls = m[1];
        expect(cls, `${file}: header must include top-0`).toMatch(/\btop-0\b/);
        expect(cls, `${file}: header must be solid bg-background`).toMatch(/\bbg-background\b/);
        expect(
          cls,
          `${file}: header must not be translucent (bg-background/NN would bleed the video)`,
        ).not.toMatch(/bg-background\/\d+/);
        expect(cls, `${file}: header must not use backdrop-blur`).not.toMatch(/backdrop-blur/);
      }
    });
  }
});

describe("FullBleedSection keeps its viewport-breakout classes", () => {
  const src = read("src/components/FullBleedSection.tsx");
  it("uses left-1/2 right-1/2 -mx-[50vw] w-screen", () => {
    expect(src).toMatch(/left-1\/2/);
    expect(src).toMatch(/right-1\/2/);
    expect(src).toMatch(/-mx-\[50vw\]/);
    expect(src).toMatch(/w-screen/);
    expect(src).toMatch(/max-w-none/);
  });
  it("hides horizontal overflow so the breakout never adds a scrollbar", () => {
    expect(src).toMatch(/overflow-hidden/);
  });
});

describe("VideoBanner renders through FullBleedSection", () => {
  const src = read("src/components/VideoBanner.tsx");
  it("wraps children in <FullBleedSection>", () => {
    expect(src).toMatch(/import\s+\{\s*FullBleedSection\s*\}/);
    expect(src).toMatch(/<FullBleedSection\b/);
  });
  it("does not add its own horizontal padding to the outer section", () => {
    // px-* on the FullBleedSection would reintroduce edge gaps.
    const outer = src.match(/<FullBleedSection[^>]*className=\{?[^>]*>/s);
    expect(outer, "FullBleedSection usage not found").not.toBeNull();
    expect(outer![0]).not.toMatch(/\bpx-\d/);
    expect(outer![0]).not.toMatch(/\bmx-\d/);
  });
});

describe("Hero and EditorialBand use the shared VideoBanner", () => {
  const heroSrc = read("src/components/marketing/Hero.tsx");
  const bandSrc = read("src/components/dashboard/EditorialBand.tsx");

  it("Hero renders a <VideoBanner>", () => {
    expect(heroSrc).toMatch(/import\s+\{\s*VideoBanner\s*\}/);
    expect(heroSrc).toMatch(/<VideoBanner\b/);
    // Explicitly must NOT wrap the banner in a padded container.
    expect(heroSrc).not.toMatch(/<div[^>]*\bpx-\d[^>]*>\s*<VideoBanner/);
  });

  it("EditorialBand renders a <VideoBanner>", () => {
    expect(bandSrc).toMatch(/import\s+\{\s*VideoBanner\s*\}/);
    expect(bandSrc).toMatch(/<VideoBanner\b/);
    expect(bandSrc).not.toMatch(/<div[^>]*\bpx-\d[^>]*>\s*<VideoBanner/);
  });
});

describe("Dashboard and Watchlist mount the band at the top of PageLayout", () => {
  const dashSrc = read("src/routes/_authenticated/dashboard.tsx");
  const watchSrc = read("src/routes/_authenticated/watchlist.tsx");

  it("dashboard renders <EditorialBand>", () => {
    expect(dashSrc).toMatch(/<EditorialBand\b/);
  });
  it("watchlist renders <EditorialBand>", () => {
    expect(watchSrc).toMatch(/<EditorialBand\b/);
  });
});

/**
 * Reduced-motion + overlay consistency: any future full-bleed editorial
 * band MUST reuse `VideoBanner` / `MediaBackdrop` so overlay spacing,
 * scrim variants, and the `prefers-reduced-motion` poster swap stay
 * identical across sections. Hand-rolled `<video>` tags in components
 * or routes drift from that contract and are forbidden.
 */
describe("full-bleed bands share the reduced-motion + overlay pattern", () => {
  const { readdirSync, statSync } = require("node:fs") as typeof import("node:fs");

  const ALLOWED = new Set([
    "src/components/MediaBackdrop.tsx",
    "src/components/VideoBanner.tsx",
  ]);

  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = `${dir}/${entry}`;
      const rel = full.replace(`${resolve(__dirname, "..", "..")}/`, "");
      const s = statSync(full);
      if (s.isDirectory()) {
        if (entry === "node_modules" || entry.startsWith(".")) continue;
        walk(full, out);
      } else if (/\.(tsx|jsx)$/.test(entry) && !entry.endsWith(".test.tsx")) {
        out.push(rel);
      }
    }
    return out;
  }

  const files = walk(resolve(__dirname, "..", "..", "src"));

  it("no component/route defines a raw <video> outside MediaBackdrop", () => {
    const offenders: string[] = [];
    for (const rel of files) {
      if (ALLOWED.has(rel)) continue;
      const src = read(rel);
      if (/<video[\s>]/.test(src)) offenders.push(rel);
    }
    expect(
      offenders,
      `Use <VideoBanner> or <MediaBackdrop> instead of a raw <video>: ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("MediaBackdrop still owns the prefers-reduced-motion swap", () => {
    const src = read("src/components/MediaBackdrop.tsx");
    expect(src).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(src).toMatch(/useReducedMotion/);
  });

  it("VideoBanner exposes the shared overlay contract", () => {
    const src = read("src/components/VideoBanner.tsx");
    expect(src).toMatch(/MediaBackdropOptions/);
    expect(src).toMatch(/scrim\s*=\s*"none"/);
  });
});

