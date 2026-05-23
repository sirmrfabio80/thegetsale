import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback } from "react";
import { toast } from "@/lib/toast";
import type { WatchlistItem } from "./types";
import {
  addToWatchlist,
  listWatchlist,
  removeFromWatchlist,
  removeManyFromWatchlist,
  type WatchlistEntryDTO,
} from "@/lib/watchlist.functions";

export const watchlistQueryOptions = queryOptions({
  queryKey: ["watchlist"] as const,
  queryFn: () => listWatchlist(),
});

function toItem(e: WatchlistEntryDTO): WatchlistItem {
  return { brandId: e.brandId, addedAt: e.addedAt };
}

/**
 * Reads the signed-in user's watchlist. Suspends on first load; route loaders
 * should prefetch via `watchlistQueryOptions` to avoid the flash.
 */
export function useWatchlist(): WatchlistItem[] {
  const { data } = useSuspenseQuery(watchlistQueryOptions);
  return data.map(toItem);
}

/**
 * Mutations for the user's watchlist. All actions persist to the backend and
 * invalidate the shared query so every consumer (cards, watchlist page) stays
 * in sync.
 */
export function useWatchlistMutations() {
  const queryClient = useQueryClient();
  const addFn = useServerFn(addToWatchlist);
  const removeFn = useServerFn(removeFromWatchlist);
  const removeManyFn = useServerFn(removeManyFromWatchlist);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: watchlistQueryOptions.queryKey });

  const addMutation = useMutation({
    mutationFn: (slug: string) => addFn({ data: { slug } }),
    // Optimistic add so the bookmark fills instantly.
    onMutate: async (slug) => {
      await queryClient.cancelQueries({ queryKey: watchlistQueryOptions.queryKey });
      const previous = queryClient.getQueryData<WatchlistEntryDTO[]>(
        watchlistQueryOptions.queryKey,
      );
      if (previous && !previous.some((e) => e.brandId === slug)) {
        queryClient.setQueryData<WatchlistEntryDTO[]>(watchlistQueryOptions.queryKey, [
          {
            brandId: slug,
            brandUuid: "optimistic",
            addedAt: new Date().toISOString(),
          },
          ...previous,
        ]);
      }
      return { previous };
    },
    onError: (err, _slug, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(watchlistQueryOptions.queryKey, ctx.previous);
      }
      toast.error(err instanceof Error ? err.message : "Couldn't add to watchlist");
    },
    onSettled: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (slug: string) => removeFn({ data: { slug } }),
    onMutate: async (slug) => {
      await queryClient.cancelQueries({ queryKey: watchlistQueryOptions.queryKey });
      const previous = queryClient.getQueryData<WatchlistEntryDTO[]>(
        watchlistQueryOptions.queryKey,
      );
      if (previous) {
        queryClient.setQueryData<WatchlistEntryDTO[]>(
          watchlistQueryOptions.queryKey,
          previous.filter((e) => e.brandId !== slug),
        );
      }
      return { previous };
    },
    onError: (err, _slug, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(watchlistQueryOptions.queryKey, ctx.previous);
      }
      toast.error(err instanceof Error ? err.message : "Couldn't update watchlist");
    },
    onSettled: invalidate,
  });

  const removeManyMutation = useMutation({
    mutationFn: (slugs: string[]) => removeManyFn({ data: { slugs } }),
    onMutate: async (slugs) => {
      await queryClient.cancelQueries({ queryKey: watchlistQueryOptions.queryKey });
      const previous = queryClient.getQueryData<WatchlistEntryDTO[]>(
        watchlistQueryOptions.queryKey,
      );
      if (previous) {
        const set = new Set(slugs);
        queryClient.setQueryData<WatchlistEntryDTO[]>(
          watchlistQueryOptions.queryKey,
          previous.filter((e) => !set.has(e.brandId)),
        );
      }
      return { previous };
    },
    onError: (err, _slugs, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(watchlistQueryOptions.queryKey, ctx.previous);
      }
      toast.error(err instanceof Error ? err.message : "Couldn't update watchlist");
    },
    onSettled: invalidate,
  });

  const add = useCallback(
    (slug: string, brandName?: string) => {
      addMutation.mutate(slug, {
        onSuccess: () => {
          if (brandName) toast.success(`${brandName} added to watchlist`);
        },
      });
    },
    [addMutation],
  );

  const remove = useCallback(
    (slug: string, brandName?: string) => {
      removeMutation.mutate(slug, {
        onSuccess: () => {
          if (brandName) toast(`${brandName} removed from watchlist`);
        },
      });
    },
    [removeMutation],
  );

  const removeMany = useCallback(
    (slugs: string[]) => {
      if (slugs.length === 0) return;
      removeManyMutation.mutate(slugs, {
        onSuccess: () => {
          toast(
            `${slugs.length} ${slugs.length === 1 ? "house" : "houses"} removed from watchlist`,
          );
        },
      });
    },
    [removeManyMutation],
  );

  return {
    add,
    remove,
    removeMany,
    isPending: addMutation.isPending || removeMutation.isPending || removeManyMutation.isPending,
  };
}
