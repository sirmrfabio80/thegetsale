import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPrivateBetaEnabled } from "@/lib/app-settings.functions";

export const PRIVATE_BETA_QUERY_KEY = ["app-settings", "private-beta"] as const;

export function usePrivateBeta() {
  const fetcher = useServerFn(getPrivateBetaEnabled);
  const query = useQuery({
    queryKey: PRIVATE_BETA_QUERY_KEY,
    queryFn: () => fetcher(),
    staleTime: 60_000,
  });
  // Default to ON (safer) while loading or on error.
  const enabled = query.data?.privateBetaEnabled ?? true;
  return { enabled, isLoading: query.isLoading };
}
