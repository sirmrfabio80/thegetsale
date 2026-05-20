import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile, type ProfileDTO } from "@/lib/profile.functions";
import { useAuth } from "@/lib/auth";

export function useProfile() {
  const auth = useAuth();
  const fetchProfile = useServerFn(getMyProfile);
  const query = useQuery<ProfileDTO>({
    queryKey: ["me", "profile", auth.user?.id ?? null],
    queryFn: () => fetchProfile(),
    enabled: auth.status === "authenticated",
    staleTime: 60_000,
  });

  // Warm the browser cache for the avatar as soon as the URL is known, so the
  // top-nav photo is already decoded by the time the user lands on any page
  // that renders <AvatarBlock>. We track the last URL we prefetched so we
  // don't re-issue the request when the signed URL rotates to the same path.
  const prefetchedRef = useRef<string | null>(null);
  const avatarUrl = query.data?.avatarUrl ?? null;
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!avatarUrl || prefetchedRef.current === avatarUrl) return;
    prefetchedRef.current = avatarUrl;
    const img = new Image();
    img.decoding = "async";
    img.src = avatarUrl;
  }, [avatarUrl]);

  return query;
}
