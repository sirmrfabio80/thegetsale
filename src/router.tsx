import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { routeTree } from "./routeTree.gen";
import { subscribeToUser } from "./lib/auth";

export type RouterAuth = {
  status: "loading" | "authenticated" | "unauthenticated";
  user: User | null;
};

export const getRouter = () => {
  // Fresh QueryClient per request — never share across SSR requests.
  // Defaults tuned to reduce refetch churn on long-lived tabs (the main
  // contributor to Safari's "significant memory" reloads).
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
      },
    },
  });

  const initialAuth: RouterAuth = { status: "loading", user: null };

  const router = createRouter({
    routeTree,
    context: { queryClient, auth: initialAuth },
    scrollRestoration: true,
    // Non-zero so link-hover prefetches aren't instantly stale and refetched
    // on the actual navigation. Query's own staleTime still controls
    // freshness end-to-end.
    defaultPreloadStaleTime: 30_000,
  });

  if (typeof window !== "undefined") {
    // Subscribe through the shared auth store instead of opening a second
    // `supabase.auth.onAuthStateChange`. Previously both the store AND the
    // router subscribed, so every TOKEN_REFRESHED ran the cache
    // invalidation + route reload twice.
    let lastUserId: string | null | undefined;
    subscribeToUser((user) => {
      const nextId = user?.id ?? null;
      if (nextId === lastUserId) return;
      lastUserId = nextId;
      router.update({
        context: {
          queryClient,
          auth: { status: user ? "authenticated" : "unauthenticated", user },
        },
      });
      queryClient.invalidateQueries();
      router.invalidate();
    });
  }

  return router;
};
