/**
 * Lightweight in-app performance logger (development only).
 *
 * Tracks:
 *  - Route transitions (path + duration, via router subscription).
 *  - Query cache invalidation count (wraps `QueryClient.invalidateQueries`
 *    and `QueryClient.removeQueries`).
 *  - Memory: periodic JS heap snapshots via `performance.memory` (Chromium)
 *    and any browser-emitted memory pressure / page-eviction signals.
 *
 * All output is gated behind `PERF_CONFIG.loggerEnabled` (DEV by default)
 * and uses a single `console.groupCollapsed` per event so it's easy to
 * filter in DevTools (`[perf]`). No user-facing UI, no production cost.
 */

import type { QueryClient } from "@tanstack/react-query";
import type { AnyRouter } from "@tanstack/react-router";
import { PERF_CONFIG } from "./perf-config";

type PerfMemory = {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
};

type PerformanceWithMemory = Performance & { memory?: PerfMemory };

let installed = false;

function fmtMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function log(label: string, ...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log(`%c[perf]%c ${label}`, "color:#888", "color:inherit", ...args);
}

function warn(label: string, ...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.warn(`[perf] ${label}`, ...args);
}

export function installPerfLogger(router: AnyRouter, queryClient: QueryClient): void {
  if (installed) return;
  if (!PERF_CONFIG.loggerEnabled) return;
  if (typeof window === "undefined") return;
  installed = true;

  log("logger installed", {
    staleTime: PERF_CONFIG.queryStaleTime,
    gcTime: PERF_CONFIG.queryGcTime,
    preloadStaleTime: PERF_CONFIG.preloadStaleTime,
  });

  // --- Route transitions -------------------------------------------------
  let navStart: number | null = null;
  let lastPath: string | null = null;

  router.subscribe("onBeforeNavigate", (e) => {
    navStart = performance.now();
    const to = (e as unknown as { toLocation?: { pathname?: string } }).toLocation?.pathname;
    if (to) lastPath = to;
  });

  router.subscribe("onResolved", () => {
    if (navStart == null) return;
    const ms = Math.round(performance.now() - navStart);
    log(`nav → ${lastPath ?? "?"} (${ms}ms)`);
    navStart = null;
  });

  // --- Query invalidation counter ---------------------------------------
  let invalidations = 0;
  let removals = 0;
  const origInvalidate = queryClient.invalidateQueries.bind(queryClient);
  const origRemove = queryClient.removeQueries.bind(queryClient);

  queryClient.invalidateQueries = ((filters?: Parameters<typeof origInvalidate>[0], options?: Parameters<typeof origInvalidate>[1]) => {
    invalidations += 1;
    const key = filters && "queryKey" in filters ? filters.queryKey : "(all)";
    log(`invalidateQueries #${invalidations}`, key);
    return origInvalidate(filters, options);
  }) as typeof queryClient.invalidateQueries;

  queryClient.removeQueries = ((filters?: Parameters<typeof origRemove>[0]) => {
    removals += 1;
    log(`removeQueries #${removals}`, filters && "queryKey" in filters ? filters.queryKey : "(all)");
    return origRemove(filters);
  }) as typeof queryClient.removeQueries;

  // --- Memory snapshots --------------------------------------------------
  const perf = performance as PerformanceWithMemory;
  let baseline: number | null = null;
  let lastWarnedMultiplier = 1;

  const snapshot = (reason: string) => {
    if (!perf.memory) return;
    const used = perf.memory.usedJSHeapSize;
    if (baseline == null) baseline = used;
    const ratio = used / baseline;
    log(
      `heap ${fmtMB(used)} / ${fmtMB(perf.memory.totalJSHeapSize)} (limit ${fmtMB(perf.memory.jsHeapSizeLimit)}) — ${reason}`,
      {
        invalidations,
        removals,
        cachedQueries: queryClient.getQueryCache().getAll().length,
      },
    );
    if (ratio >= PERF_CONFIG.heapGrowthWarnMultiplier && ratio > lastWarnedMultiplier) {
      lastWarnedMultiplier = ratio;
      warn(`mem-growth: heap grew ${ratio.toFixed(2)}× since first sample`);
    }
  };

  if (PERF_CONFIG.heapSampleIntervalMs > 0) {
    setInterval(() => snapshot("interval"), PERF_CONFIG.heapSampleIntervalMs);
  }
  snapshot("install");

  document.addEventListener("visibilitychange", () => {
    snapshot(document.visibilityState === "visible" ? "visible" : "hidden");
  });

  // Safari fires `pagehide` with persisted=false when it evicts a tab for memory.
  window.addEventListener("pagehide", (e) => {
    log("pagehide", { persisted: (e as PageTransitionEvent).persisted });
  });
}
