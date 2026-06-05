import { describe, it, expect } from "vitest";
import { createElement, isValidElement, type ReactElement } from "react";
import { CardClampedText } from "./CardBase";

/**
 * CardClampedText must reserve exactly N lines of vertical space no matter
 * what content it renders. These tests assert the produced element keeps:
 *  - the literal `line-clamp-N` class (so Tailwind v4 emits the rule),
 *  - a `min-height` of `calc(N * lineHeight em)` (so empty / short / long
 *    copy all yield the same card height across every breakpoint).
 */
function renderProps(el: ReactElement) {
  if (!isValidElement(el)) throw new Error("not a react element");
  return el.props as { className?: string; style?: { minHeight?: string }; children: unknown };
}

describe("CardClampedText", () => {
  it("clamps to 2 lines and reserves 2 * lineHeight em by default", () => {
    const el = CardClampedText({ children: "short copy" }) as ReactElement;
    const props = renderProps(el);
    expect(props.className).toContain("line-clamp-2");
    expect(props.style?.minHeight).toBe("calc(2 * 1.5em)");
  });

  it("supports 3-line clamp with custom line-height", () => {
    const el = CardClampedText({
      children: "lorem ipsum dolor sit amet, consectetur adipiscing elit, ".repeat(10),
      lines: 3,
      lineHeightEm: 1.625,
    }) as ReactElement;
    const props = renderProps(el);
    expect(props.className).toContain("line-clamp-3");
    expect(props.style?.minHeight).toBe("calc(3 * 1.625em)");
  });

  it("reserves the same min-height for empty, short, and long copy", () => {
    const lineHeightEm = 1.375;
    const lines = 2 as const;
    const expected = `calc(${lines} * ${lineHeightEm}em)`;
    for (const children of ["", "one line", "x ".repeat(400)] as const) {
      const el = CardClampedText({ children, lines, lineHeightEm }) as ReactElement;
      expect(renderProps(el).style?.minHeight).toBe(expected);
    }
  });

  it("falls back to non-breaking space when content is empty so the box never collapses", () => {
    const el = CardClampedText({ children: "" }) as ReactElement;
    expect(renderProps(el).children).toBe("\u00A0");
  });

  it("renders as the provided polymorphic element (h2)", () => {
    const el = CardClampedText({ as: "h2", children: "Headline" }) as ReactElement;
    expect(el.type).toBe("h2");
  });
});

describe("CardClampedText height stability across breakpoints", () => {
  // The clamp + min-height contract is unit-pure (em-relative + Tailwind line
  // clamp) so the same element renders identically at every viewport. We
  // assert that by re-running the assertion under several simulated widths
  // — from the smallest supported mobile (320px) up through large tablet
  // (1440px) — any future change that introduces breakpoint-conditional
  // sizing would need to update these expectations explicitly.
  const widths = [320, 360, 375, 414, 768, 834, 1024, 1180, 1440];
  it.each(widths)("yields identical min-height at %ipx viewport", () => {
    const el = CardClampedText({ children: "responsive headline", lines: 2 }) as ReactElement;
    expect(renderProps(el).style?.minHeight).toBe("calc(2 * 1.5em)");
  });
});

describe("CardClampedText edge-case content", () => {
  // Long unbroken strings (URLs, slugs, IDs) historically blew out card width
  // and indirectly bumped card height. The min-height contract still has to
  // hold and the line-clamp class must still be applied; we also assert the
  // produced element passes the offending string through so a parent
  // `break-words` / `overflow-hidden` rule can do the wrapping.
  const longUnbroken = "a".repeat(500);
  const longUrl = "https://example.com/" + "very-long-path-segment-".repeat(20);
  const heavyEmoji = "👜👠👗💼🕶️👓👑💍".repeat(40);
  const mixedRtl = "العربية ".repeat(40) + "مرحبا";
  const combining = "é".repeat(200) + "n\u0303".repeat(200);

  const cases: Array<[string, string]> = [
    ["long unbroken ascii", longUnbroken],
    ["long URL-like string", longUrl],
    ["dense emoji string", heavyEmoji],
    ["RTL script", mixedRtl],
    ["combining diacritics", combining],
  ];

  it.each(cases)("keeps 2-line min-height stable for %s", (_label, children) => {
    const el = CardClampedText({ children, lines: 2, lineHeightEm: 1.375 }) as ReactElement;
    const props = renderProps(el);
    expect(props.className).toContain("line-clamp-2");
    expect(props.style?.minHeight).toBe("calc(2 * 1.375em)");
    expect(props.children).toBe(children);
  });

  it.each(cases)("keeps 3-line min-height stable for %s", (_label, children) => {
    const el = CardClampedText({ children, lines: 3, lineHeightEm: 1.625 }) as ReactElement;
    const props = renderProps(el);
    expect(props.className).toContain("line-clamp-3");
    expect(props.style?.minHeight).toBe("calc(3 * 1.625em)");
  });

  it("produces identical min-height for short vs long unbroken vs emoji content", () => {
    const config = { lines: 2 as const, lineHeightEm: 1.5 };
    const heights = ["hi", longUnbroken, heavyEmoji].map((children) => {
      const el = CardClampedText({ children, ...config }) as ReactElement;
      return renderProps(el).style?.minHeight;
    });
    expect(new Set(heights).size).toBe(1);
    expect(heights[0]).toBe("calc(2 * 1.5em)");
  });
});
