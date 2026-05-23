import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback } from "react";
import { toast } from "@/lib/toast";
import { getMySetup, saveMySetup, type SetupDTO } from "@/lib/setup.functions";

export const setupQueryOptions = queryOptions({
  queryKey: ["setup", "me"] as const,
  queryFn: () => getMySetup(),
  staleTime: 30_000,
});

const EMPTY: SetupDTO = {
  departments: [],
  houses: [],
  categories: [],
  styles: [],
  notifications: { emailSignals: true, smsDrops: false, weeklyDigest: false },
  completedAt: null,
};

/** Returns the user's setup (or null while loading / never set). */
export function useSetup(): { setup: SetupDTO | null; isLoading: boolean } {
  const { data, isLoading } = useQuery(setupQueryOptions);
  return { setup: data ?? null, isLoading };
}

type SavePayload = Partial<Omit<SetupDTO, "completedAt">> & {
  markCompleted?: boolean;
};

export function useSetupMutation() {
  const queryClient = useQueryClient();
  const saveFn = useServerFn(saveMySetup);

  const mutation = useMutation({
    mutationFn: async (payload: SavePayload) => {
      const current = queryClient.getQueryData<SetupDTO | null>(setupQueryOptions.queryKey) ?? null;
      const base = current ?? EMPTY;
      const merged = {
        departments: payload.departments ?? base.departments,
        houses: payload.houses ?? base.houses,
        categories: payload.categories ?? base.categories,
        styles: payload.styles ?? base.styles,
        notifications: payload.notifications ?? base.notifications,
        markCompleted: payload.markCompleted ?? false,
      };
      return saveFn({ data: merged });
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: setupQueryOptions.queryKey });
      const previous = queryClient.getQueryData<SetupDTO | null>(setupQueryOptions.queryKey);
      const base = previous ?? EMPTY;
      const optimistic: SetupDTO = {
        departments: payload.departments ?? base.departments,
        houses: payload.houses ?? base.houses,
        categories: payload.categories ?? base.categories,
        styles: payload.styles ?? base.styles,
        notifications: payload.notifications ?? base.notifications,
        completedAt: payload.markCompleted ? new Date().toISOString() : base.completedAt,
      };
      queryClient.setQueryData<SetupDTO | null>(setupQueryOptions.queryKey, optimistic);
      return { previous };
    },
    onError: (err, _payload, ctx) => {
      if (ctx) {
        queryClient.setQueryData(setupQueryOptions.queryKey, ctx.previous);
      }
      toast.error(err instanceof Error ? err.message : "Couldn't save setup");
    },
    onSuccess: (data) => {
      queryClient.setQueryData<SetupDTO | null>(setupQueryOptions.queryKey, data);
    },
  });

  const save = useCallback((payload: SavePayload) => mutation.mutate(payload), [mutation]);

  return { save, isPending: mutation.isPending };
}
