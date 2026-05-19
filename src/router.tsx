import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { getAuth } from "./lib/auth";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient, auth: getAuth() },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  if (typeof window !== "undefined") {
    const refresh = () => {
      router.update({ context: { queryClient, auth: getAuth() } });
      router.invalidate();
    };
    window.addEventListener("theget:auth", refresh);
    window.addEventListener("storage", refresh);
  }

  return router;
};
