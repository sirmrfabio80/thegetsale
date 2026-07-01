import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { MediaBackdropOptions } from "@/components/media/types";

export type { MediaBackdropOptions, MediaSources, MediaScrim } from "@/components/media/types";

/**
 * SSR-safe reduced-motion hook. Returns true when the user has
 * `prefers-reduced-motion: reduce` set.
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * MediaBackdrop only consumes the media-layer subset of `MediaBackdropOptions`
 * — scrim/grain live on the wrapping banner so they can be composed above
 * the media without leaking into this primitive.
 */
export type MediaBackdropProps = Pick<
  MediaBackdropOptions,
  "poster" | "webm" | "mp4" | "className"
>;

/**
 * Single fallback pattern used by every full-bleed media section. Renders
 * an absolute-positioned, object-cover video by default; swaps to the
 * static poster image when the user prefers reduced motion or when no
 * video sources are provided.
 */
export function MediaBackdrop({ poster, webm, mp4, className }: MediaBackdropProps) {
  const reducedMotion = useReducedMotion();
  const hasVideo = Boolean(webm || mp4);
  const hasPoster = Boolean(poster);
  const shared = cn("absolute inset-0 h-full w-full object-cover", className);

  if (!hasVideo && !hasPoster) return null;

  if (!hasVideo || reducedMotion) {
    if (!hasPoster) return null;
    return (
      <img
        src={poster}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={cn(shared, "select-none")}
      />
    );
  }

  return (
    <video
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster={poster}
      aria-hidden="true"
      className={shared}
    >
      {webm && <source src={webm} type="video/webm" />}
      {mp4 && <source src={mp4} type="video/mp4" />}
    </video>
  );
}
