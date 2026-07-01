import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Scroll restoration between Dashboard and Watchlist relies on three
 * router-level invariants. If any regress, returning to a feed via the
 * top-nav (or back/forward) will silently jump to the top:
 *
 *   1. `scrollRestoration: true` on the router.
 *   2. `getScrollRestorationKey` keyed on pathname, so a fresh history
 *      entry for /dashboard or /watchlist reuses the same slot as the
 *      previous visit (not just browser back/forward).
 *   3. Watchlist mutations that add/remove items pass `resetScroll: false`
 *      so local updates don't yank the user back to the top.
 *
 * Runtime behaviour is covered separately by the Playwright check in
 * /tmp/browser/scroll/run.py; this test guards the source contract.
 */

const read = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf8");

describe("dashboard/watchlist scroll restoration", () => {
  const router = read("src/router.tsx");

  it("router enables scrollRestoration", () => {
    expect(router).toMatch(/scrollRestoration:\s*true/);
  });

  it("router keys scroll restoration by pathname (not history id)", () => {
    expect(router).toMatch(
      /getScrollRestorationKey:\s*\(location\)\s*=>\s*location\.pathname/,
    );
  });

  it("watchlist local mutations navigate with resetScroll: false", () => {
    const src = read("src/routes/_authenticated/watchlist.tsx");
    const occurrences = (src.match(/resetScroll:\s*false/g) ?? []).length;
    expect(
      occurrences,
      "watchlist should preserve scroll on add/remove/undo navigations",
    ).toBeGreaterThanOrEqual(1);
  });
});
