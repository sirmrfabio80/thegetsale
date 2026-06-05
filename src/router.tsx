import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { routeTree } from "./routeTree.gen";
import { subscribeToUser } from "./lib/auth";
import { PERF_CONFIG } from "./lib/perf-config";
import { installPerfLogger } from "./lib/perf-logger";

export type RouterAuth = {
  status: "loading" | "authenticated" | "unauthenticated";
  user: User | null;
};

export const getRouter = () => {
  // Fresh QueryClient per request — never share across SSR requests.
  // Defaults sourced from `lib/perf-config.ts` for centralised tuning.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: PERF_CONFIG.queryStaleTime,
        gcTime: PERF_CONFIG.queryGcTime,
        refetchOnWindowFocus: PERF_CONFIG.refetchOnWindowFocus,
        refetchOnReconnect: PERF_CONFIG.refetchOnReconnect,
      },
    },
  });

  const initialAuth: RouterAuth = { status: "loading", user: null };

  const router = createRouter({
    routeTree,
    context: { queryClient, auth: initialAuth },
    // Per-route scroll restoration. Default keys by history-entry id, which
    // already covers browser back/forward. We override with pathname so that
    // returning to /dashboard or /watchlist via the top-nav link (a brand-new
    // history entry) ALSO lands at the prior scroll position — this is what
    // users expect on a content feed. Cross-route nav still scrolls to top
    // because each route has its own key.
    scrollRestoration: true,
    getScrollRestorationKey: (location) => location.pathname,
    // Native View Transitions: a real crossfade between routes on browsers
    // that support `document.startViewTransition`, and a silent no-op
    // (instant swap) elsewhere. Replaces the old `key={pathname}` remount +
    // `page-fade` opacity beat in PageLayout.
    defaultViewTransition: true,
    // Non-zero so link-hover prefetches aren't instantly stale and refetched
    // on the actual navigation. Query's own staleTime still controls
    // freshness end-to-end.
    defaultPreloadStaleTime: PERF_CONFIG.preloadStaleTime,
  });

  if (typeof window !== "undefined") {
    // Subscribe through the shared auth store instead of opening a second
    // `supabase.auth.onAuthStateChange`. Previously both the store AND the
    // router subscribed, so every TOKEN_REFRESHED ran the cache
    // invalidation + route reload twice.
    //
    // `undefined` = before first emit; `null` = known-unauthenticated;
    // string = current user id.
    let lastUserId: string | null | undefined;
    // User-scoped query keys we drop on account switch so cross-account data
    // can't leak. Boot (null→user) and sign-out (user→null) leave the cache
    // alone — see the branch comments below.
    const USER_SCOPED_KEY_PREFIXES = new Set([
      "watchlist",
      "setup",
      "profile",
      "houses",
    ]);
    subscribeToUser((user) => {
      const nextId = user?.id ?? null;
      if (nextId === lastUserId) return;
      const prevId = lastUserId;
      lastUserId = nextId;

      router.update({
        context: {
          queryClient,
          auth: { status: user ? "authenticated" : "unauthenticated", user },
        },
      });

      const isBootOrSignIn = !prevId && !!nextId; // undefined/null → user
      const isAccountSwitch = !!prevId && !!nextId && prevId !== nextId;
      const isSignOut = !!prevId && !nextId;

      if (isSignOut) {
        // Do NOT invalidate queries — _authenticated will redirect to /login
        // and any in-flight refetch would 401 against the cleared session,
        // tripping AuthErrorRecovery in a loop.
        return;
      }
      if (isAccountSwitch) {
        // Drop user-scoped caches only; protected route loaders will refetch.
        queryClient.invalidateQueries({
          predicate: (q) => {
            const head = q.queryKey[0];
            return typeof head === "string" && USER_SCOPED_KEY_PREFIXES.has(head);
          },
        });
      }
      // Boot/sign-in: re-run loaders so protected data prefetches now that
      // auth context is "authenticated". Deliberately skip invalidateQueries
      // — there is nothing stale to clear, and clearing forces the just-
      // arriving data to re-suspend right after first paint (skeleton flash).
      if (isBootOrSignIn || isAccountSwitch) {
        router.invalidate();
      }
    });

    // Dev-only perf logger: route transitions, invalidations, heap samples.
    installPerfLogger(router, queryClient);
  }

  return router;
};
