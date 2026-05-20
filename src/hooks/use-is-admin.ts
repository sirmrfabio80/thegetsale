import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyAdminStatus } from "@/lib/admin.functions";
import { useAuth } from "@/lib/auth";

export function useIsAdmin() {
  const auth = useAuth();
  const fetchStatus = useServerFn(getMyAdminStatus);
  return useQuery({
    queryKey: ["me", "admin", auth.user?.id ?? null],
    queryFn: () => fetchStatus(),
    enabled: auth.status === "authenticated",
    staleTime: 60_000,
  });
}
