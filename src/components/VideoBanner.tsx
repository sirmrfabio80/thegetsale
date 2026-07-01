import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FullBleedSection } from "@/components/FullBleedSection";
import { MediaBackdrop } from "@/components/MediaBackdrop";

interface VideoBannerProps {
  /** Optional WebM source. */
  webm?: string;
  /** Optional MP4 source. */
  mp4?: string;
  /** Poster image; always shown as fallback and under reduced motion. */
  poster?: string;
  /** Accessible label for the banner region. */
  ariaLabel?: string;
  /** Extra classes applied to the outer full-bleed section. */
  className?: string;
  /** Inline style on the outer section (e.g. fixed height). */
  style?: CSSProperties;
  /**
   * Built-in dark gradient overlay for text legibility.
   * - "none" (default): no overlay
   * - "bottom": bottom-up dark gradient (hero-style)
   * - "full": light dark wash across the whole surface
   */
  scrim?: "none" | "bottom" | "full";
  /**
   * Optional paper-grain overlay above the media, below content.
   * Uses the existing `.paper-grain-heavy` utility.
   */
  grain?: boolean;
  /** Foreground content, rendered above media and overlays. */
  children?: ReactNode;
}

/**
 * Shared full-bleed video banner: renders a `<FullBleedSection>` with a
 * `MediaBackdrop` (video with poster fallback, honours reduced motion)
 * and optional dark scrim / paper-grain overlays. Consumers layer their
 * own copy or captions via `children`.
 */
export function VideoBanner({
  webm,
  mp4,
  poster,
  ariaLabel,
  className,
  style,
  scrim = "none",
  grain = false,
  children,
}: VideoBannerProps) {
  return (
    <FullBleedSection ariaLabel={ariaLabel} className={cn("isolate", className)} style={style}>
      <MediaBackdrop poster={poster ?? ""} webm={webm} mp4={mp4} />

      {grain && <div aria-hidden="true" className="paper-grain-heavy absolute inset-0" />}

      {scrim === "bottom" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent"
        />
      )}
      {scrim === "full" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-black/35"
        />
      )}

      {children != null && <div className="relative z-10 h-full w-full">{children}</div>}
    </FullBleedSection>
  );
}
