/**
 * Central performance / caching tunables.
 *
 * Single source of truth for QueryClient defaults and the router's preload
 * staleness. Edit these to iterate on cache behaviour without hunting
 * through `src/router.tsx` and individual route files.
 *
 * All values are in milliseconds unless noted.
 */

export const PERF_CONFIG = {
  /** TanStack Query: how long a query stays "fresh" before background refetch. */
  queryStaleTime: 60_000,
  /** TanStack Query: how long unused queries live in cache. */
  queryGcTime: 5 * 60_000,
  /** TanStack Query: refetch when the tab regains focus. */
  refetchOnWindowFocus: false,
  /** TanStack Query: refetch when network reconnects. */
  refetchOnReconnect: true,
  /**
   * TanStack Router: how long a link-hover preload stays valid before the
   * actual navigation re-fetches. Keep > 0 to avoid double fetches on
   * hover-then-click; Query's own staleTime still bounds freshness.
   */
  preloadStaleTime: 30_000,

  /** Dev-only perf logger toggle. Turn off to silence the console group. */
  loggerEnabled: import.meta.env.DEV,
  /** Heap snapshot interval (ms) when the logger is enabled. 0 = disabled. */
  heapSampleIntervalMs: 15_000,
  /**
   * If JS heap grows past this multiplier vs. the first sample, emit a
   * `mem-growth` warning. 2 = doubled since page load.
   */
  heapGrowthWarnMultiplier: 2,
} as const;

export type PerfConfig = typeof PERF_CONFIG;
