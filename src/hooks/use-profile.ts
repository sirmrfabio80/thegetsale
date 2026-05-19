import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile, type ProfileDTO } from "@/lib/profile.functions";
import { useAuth } from "@/lib/auth";

export function useProfile() {
  const auth = useAuth();
  const fetchProfile = useServerFn(getMyProfile);
  return useQuery<ProfileDTO>({
    queryKey: ["me", "profile", auth.user?.id ?? null],
    queryFn: () => fetchProfile(),
    enabled: auth.status === "authenticated",
    staleTime: 60_000,
  });
}
