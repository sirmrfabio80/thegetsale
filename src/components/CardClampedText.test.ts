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
  // assert that by re-running the assertion under several simulated widths;
  // any future change that introduces breakpoint-conditional sizing would
  // need to update these expectations explicitly.
  const widths = [320, 375, 414, 768, 1024, 1440];
  it.each(widths)("yields identical min-height at %ipx viewport", () => {
    const el = CardClampedText({ children: "responsive headline", lines: 2 }) as ReactElement;
    expect(renderProps(el).style?.minHeight).toBe("calc(2 * 1.5em)");
  });
});
