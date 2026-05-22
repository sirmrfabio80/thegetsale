import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { routeTree } from "./routeTree.gen";
import { supabase } from "./integrations/supabase/client";

export type RouterAuth = {
  status: "loading" | "authenticated" | "unauthenticated";
  user: User | null;
};

export const getRouter = () => {
  const queryClient = new QueryClient();

  const initialAuth: RouterAuth = { status: "loading", user: null };

  const router = createRouter({
    routeTree,
    context: { queryClient, auth: initialAuth },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  if (typeof window !== "undefined") {
    const apply = (user: User | null) => {
      router.update({
        context: {
          queryClient,
          auth: { status: user ? "authenticated" : "unauthenticated", user },
        },
      });
      queryClient.invalidateQueries();
      router.invalidate();
    };

    // onAuthStateChange fires INITIAL_SESSION on subscribe, so we rely on
    // it alone — a separate getSession() call would invalidate every query
    // twice on boot.
    supabase.auth.onAuthStateChange((_event, session) => {
      apply(session?.user ?? null);
    });
  }

  return router;
};
