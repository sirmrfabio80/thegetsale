import { describe, it, expect } from "vitest";
import { safeRedirect, resolveRedirect } from "./safeRedirect";

describe("safeRedirect", () => {
  it("returns the fallback for non-string input", () => {
    expect(safeRedirect(undefined)).toBe("/dashboard");
    expect(safeRedirect(null)).toBe("/dashboard");
    expect(safeRedirect(42)).toBe("/dashboard");
    expect(safeRedirect({})).toBe("/dashboard");
  });

  it("returns the fallback for empty or whitespace-only strings", () => {
    expect(safeRedirect("")).toBe("/dashboard");
    expect(safeRedirect("   ")).toBe("/dashboard");
  });

  it("accepts same-origin absolute paths", () => {
    expect(safeRedirect("/dashboard")).toBe("/dashboard");
    expect(safeRedirect("/watchlist")).toBe("/watchlist");
    expect(safeRedirect("/brand/acme")).toBe("/brand/acme");
    expect(safeRedirect("/brand/acme?x=1")).toBe("/brand/acme?x=1");
  });

  it("rejects protocol-relative URLs", () => {
    expect(safeRedirect("//evil.com")).toBe("/dashboard");
    expect(safeRedirect("//evil.com/brand/x")).toBe("/dashboard");
  });

  it("rejects backslash-prefixed paths", () => {
    expect(safeRedirect("/\\evil.com")).toBe("/dashboard");
  });

  it("rejects absolute URLs and non-rooted paths", () => {
    expect(safeRedirect("https://evil.com/brand/x")).toBe("/dashboard");
    expect(safeRedirect("http://evil.com")).toBe("/dashboard");
    expect(safeRedirect("evil.com")).toBe("/dashboard");
    expect(safeRedirect("javascript:alert(1)")).toBe("/dashboard");
    expect(safeRedirect("brand/x")).toBe("/dashboard");
  });

  it("rejects excessively long inputs", () => {
    expect(safeRedirect("/" + "a".repeat(600))).toBe("/dashboard");
  });

  it("honors a custom fallback", () => {
    expect(safeRedirect(undefined, "/watchlist")).toBe("/watchlist");
    expect(safeRedirect("//evil.com", "/login")).toBe("/login");
  });

  it("trims surrounding whitespace before validating", () => {
    expect(safeRedirect("  /brand/acme  ")).toBe("/brand/acme");
  });
});

describe("resolveRedirect", () => {
  it("resolves /brand/:id into a typed brand target", () => {
    expect(resolveRedirect("/brand/acme")).toEqual({ kind: "brand", id: "acme" });
    expect(resolveRedirect("/brand/123-abc")).toEqual({
      kind: "brand",
      id: "123-abc",
    });
  });

  it("does not match nested brand paths as typed brand routes", () => {
    expect(resolveRedirect("/brand/acme/extra")).toEqual({
      kind: "path",
      to: "/brand/acme/extra",
    });
  });

  it("resolves other safe paths as generic path targets", () => {
    expect(resolveRedirect("/watchlist")).toEqual({ kind: "path", to: "/watchlist" });
    expect(resolveRedirect("/dashboard")).toEqual({ kind: "path", to: "/dashboard" });
  });

  it("falls back to /dashboard for unsafe input", () => {
    expect(resolveRedirect(undefined)).toEqual({ kind: "path", to: "/dashboard" });
    expect(resolveRedirect("//evil.com/brand/acme")).toEqual({
      kind: "path",
      to: "/dashboard",
    });
    expect(resolveRedirect("https://evil.com/brand/acme")).toEqual({
      kind: "path",
      to: "/dashboard",
    });
  });

  it("honors a custom fallback for unsafe input", () => {
    expect(resolveRedirect(undefined, "/login")).toEqual({
      kind: "path",
      to: "/login",
    });
  });
});
