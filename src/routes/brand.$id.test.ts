import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Structural visual regression check for the /brand/$id page header.
 *
 * We don't run a real browser in this project's test setup, so we can't pixel-
 * diff. Instead we assert that the alignment-critical markup is still present:
 *
 *   - the identity row uses `flex items-center` (NOT items-start) so the
 *     `BrandLogo` tile is vertically centered with the serif `<h1>` name
 *   - the row renders BOTH a mobile-sized logo (size={56}, `md:hidden`)
 *     and a desktop-sized logo (size={88}, `hidden md:flex`), because
 *     `BrandLogo` sets width/height via inline style and cannot be
 *     responsively resized with Tailwind classes alone
 *   - this applies to BOTH the authenticated view (`AuthenticatedBrand`)
 *     and the public preview (`PublicBrandPreview`)
 *
 * If someone collapses the dual-logo pattern, switches back to
 * `items-start`, or drops the logo, this test fails. That's the regression
 * surface we care about for "logo + H1 vertical alignment at mobile and
 * desktop breakpoints".
 */

const ROUTE_FILE = resolve(__dirname, "brand.$id.tsx");
const source = readFileSync(ROUTE_FILE, "utf8");

function extractFunctionBody(src: string, fnName: string): string {
  const marker = `function ${fnName}(`;
  const start = src.indexOf(marker);
  if (start === -1) throw new Error(`Could not find function ${fnName} in route file`);
  // Walk the signature parens to find the matching `)`, then take the next `{`.
  let i = start + marker.length - 1; // points at the opening `(`
  let parenDepth = 0;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === "(") parenDepth++;
    else if (ch === ")") {
      parenDepth--;
      if (parenDepth === 0) break;
    }
  }
  i = src.indexOf("{", i);
  if (i === -1) throw new Error(`No body opening brace for ${fnName}`);
  let depth = 0;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`Unbalanced braces in ${fnName}`);
}

function assertHeader(body: string, viewName: string) {
  // Row must vertically center its children — the bug we're guarding against
  // was `items-start`, which dropped the H1 visually below the logo tile.
  expect(body, `${viewName}: expected an items-center identity row`).toMatch(
    /flex\s+items-center[^"`]*"/,
  );
  expect(body, `${viewName}: must NOT use items-start on the identity row`).not.toMatch(
    /<div className="[^"]*flex items-start[^"]*">\s*<BrandLogo/,
  );

  // Dual-sized BrandLogo pattern (mobile + desktop).
  expect(body, `${viewName}: mobile BrandLogo (size 56, md:hidden) missing`).toMatch(
    /<BrandLogo[\s\S]*?size=\{56\}[\s\S]*?className="md:hidden"[\s\S]*?\/>/,
  );
  expect(body, `${viewName}: desktop BrandLogo (size 88, hidden md:flex) missing`).toMatch(
    /<BrandLogo[\s\S]*?size=\{88\}[\s\S]*?className="hidden md:flex"[\s\S]*?\/>/,
  );

  // H1 must sit alongside the logo, with the responsive serif sizing that
  // the logo sizes are tuned against (text-5xl mobile → md:text-7xl desktop).
  expect(body, `${viewName}: H1 must be a serif name with responsive sizing`).toMatch(
    /<h1 className="[^"]*font-serif[^"]*text-5xl[^"]*md:text-7xl[^"]*">\s*\{brand\.name\}\s*<\/h1>/,
  );
}

describe("/brand/$id header: logo + H1 vertical alignment", () => {
  it("authenticated view keeps logo and H1 centered at mobile and desktop", () => {
    assertHeader(extractFunctionBody(source, "AuthenticatedBrand"), "AuthenticatedBrand");
  });

  it("public preview keeps logo and H1 centered at mobile and desktop", () => {
    assertHeader(extractFunctionBody(source, "PublicBrandPreview"), "PublicBrandPreview");
  });

  it("BrandLogo component is imported", () => {
    expect(source).toMatch(/import\s+\{\s*BrandLogo\s*\}\s+from\s+"@\/components\/BrandLogo"/);
  });
});
