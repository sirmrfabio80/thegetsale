import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

/**
 * Focus restoration across in-app navigation, especially back/forward.
 *
 * On every router navigation we snapshot the currently-focused element's
 * selector against the *current* history entry's key. When the router
 * resolves a navigation, we look up any selector previously saved against the
 * new history entry's key and restore focus there.
 *
 * This means: keyboard / screen-reader users who tab to a link, navigate
 * forward, then come back via the browser's back button (or our nav), land on
 * the same control they left from — not at the top of the page.
 *
 * Selector resolution order:
 *   1. `data-focus-key="..."` — explicit, most resilient to re-renders
 *   2. `id="..."`
 *   3. A short structural path (`tag:nth-of-type(n) > …`) capped at 6 levels
 *
 * Storage is `sessionStorage` so it is per-tab and cleared on close.
 */

const STORAGE_PREFIX = "the-get:fr:";
const MAX_PATH_DEPTH = 6;

function safeCssEscape(value: string): string {
  if (typeof window !== "undefined" && typeof window.CSS?.escape === "function") {
    return window.CSS.escape(value);
  }
  return value.replace(/(["\\])/g, "\\$1");
}

function currentHistoryKey(): string | null {
  if (typeof window === "undefined") return null;
  const state = window.history.state as { key?: unknown } | null;
  const key = state && typeof state.key === "string" ? state.key : null;
  return key ? STORAGE_PREFIX + key : null;
}

function selectorFor(el: Element): string | null {
  const dataKey = el.getAttribute("data-focus-key");
  if (dataKey) return `[data-focus-key="${safeCssEscape(dataKey)}"]`;
  if (el.id) return `#${safeCssEscape(el.id)}`;

  // Structural fallback. Walk up to <body>, recording tag + nth-of-type.
  const parts: string[] = [];
  let cur: Element | null = el;
  let depth = 0;
  while (cur && cur !== document.body && depth < MAX_PATH_DEPTH) {
    const parent: Element | null = cur.parentElement;
    if (!parent) break;
    const tag = cur.tagName.toLowerCase();
    const sameTagSiblings = Array.from(parent.children).filter(
      (c) => c.tagName === cur!.tagName,
    );
    const idx = sameTagSiblings.indexOf(cur) + 1;
    parts.unshift(`${tag}:nth-of-type(${idx})`);
    cur = parent;
    depth += 1;
  }
  return parts.length > 0 ? parts.join(" > ") : null;
}

function saveFocus() {
  const key = currentHistoryKey();
  if (!key) return;
  const el = document.activeElement as HTMLElement | null;
  if (!el || el === document.body || !(el instanceof HTMLElement)) {
    sessionStorage.removeItem(key);
    return;
  }
  const sel = selectorFor(el);
  if (sel) sessionStorage.setItem(key, sel);
  else sessionStorage.removeItem(key);
}

function restoreFocus() {
  const key = currentHistoryKey();
  if (!key) return;
  const sel = sessionStorage.getItem(key);
  if (!sel) return;

  // Two RAFs: first to let the new route paint, second so any auto-focus
  // (modals, inputs) settles before we steal focus back.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try {
        const el = document.querySelector(sel) as HTMLElement | null;
        if (el && typeof el.focus === "function") {
          el.focus({ preventScroll: true });
        }
      } catch {
        // Bad selector (DOM changed too much) — silently give up.
      }
    });
  });
}

export function useFocusRestoration() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window === "undefined") return;

    const unsubBefore = router.subscribe("onBeforeNavigate", saveFocus);
    const unsubResolved = router.subscribe("onResolved", restoreFocus);
    window.addEventListener("pagehide", saveFocus);

    return () => {
      unsubBefore();
      unsubResolved();
      window.removeEventListener("pagehide", saveFocus);
    };
  }, [router]);
}
