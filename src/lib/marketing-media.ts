import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getHeroMediaUrls, type HeroMediaUrls } from "./marketing-media.functions";

export const HERO_MEDIA_QUERY_KEY = ["marketing-media", "hero-summer"] as const;

/** Fetches signed URLs for the hero-summer video + poster; safe on public routes. */
export function useHeroMedia() {
  const fetcher = useServerFn(getHeroMediaUrls);
  return useQuery<HeroMediaUrls>({
    queryKey: HERO_MEDIA_QUERY_KEY,
    queryFn: () => fetcher(),
    staleTime: 1000 * 60 * 60, // 1h
    gcTime: 1000 * 60 * 60 * 2,
  });
}

export const HERO_MEDIA_FILES = {
  webm: "hero-summer.webm",
  mp4: "hero-summer.mp4",
  poster: "hero-summer-poster.jpg",
} as const;

export const MARKETING_MEDIA_BUCKET = "marketing-media";
