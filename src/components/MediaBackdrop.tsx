import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

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

interface MediaBackdropProps {
  /** Poster image; always shown as fallback and when reduced motion is on. */
  poster: string;
  /** Optional WebM source. */
  webm?: string;
  /** Optional MP4 source. */
  mp4?: string;
  /** Optional class overrides for the media element. */
  className?: string;
}

/**
 * Single fallback pattern used by both the marketing Hero and the
 * dashboard EditorialBand. Renders an absolute-positioned, object-cover
 * video by default; swaps to the static poster image when the user
 * prefers reduced motion or when no video sources are provided.
 *
 * Keeps overlay/scrim behaviour consistent: same absolute positioning,
 * same sizing, same `aria-hidden` treatment.
 */
export function MediaBackdrop({ poster, webm, mp4, className }: MediaBackdropProps) {
  const reducedMotion = useReducedMotion();
  const hasVideo = Boolean(webm || mp4);
  const shared = cn("absolute inset-0 h-full w-full object-cover", className);

  if (!hasVideo || reducedMotion) {
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
