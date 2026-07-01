import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FullBleedSection } from "@/components/FullBleedSection";
import { MediaBackdrop } from "@/components/MediaBackdrop";
import type { MediaBackdropOptions } from "@/components/media/types";

export interface VideoBannerProps extends MediaBackdropOptions {
  /** Accessible label for the banner region. */
  ariaLabel?: string;
  /** Extra classes applied to the outer full-bleed section. */
  className?: string;
  /** Inline style on the outer section (e.g. fixed height). */
  style?: CSSProperties;
  /** Foreground content, rendered above media and overlays. */
  children?: ReactNode;
}

function clampOpacity(value: number | undefined) {
  if (value == null || Number.isNaN(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

/**
 * Shared full-bleed video banner: renders a `<FullBleedSection>` with a
 * `MediaBackdrop` (video with poster fallback, honours reduced motion)
 * plus optional dark scrim / paper-grain overlays. Consumers layer their
 * own copy or captions via `children`.
 *
 * Props follow the shared `MediaBackdropOptions` contract so future
 * sections stay behaviourally identical.
 */
export function VideoBanner({
  webm,
  mp4,
  poster,
  className,
  style,
  scrim = "none",
  grain = false,
  overlayOpacity,
  ariaLabel,
  children,
}: VideoBannerProps) {
  const opacity = clampOpacity(overlayOpacity);
  const overlayStyle: CSSProperties | undefined =
    opacity === 1 ? undefined : { opacity };

  return (
    <FullBleedSection ariaLabel={ariaLabel} className={cn("isolate", className)} style={style}>
      <MediaBackdrop poster={poster} webm={webm} mp4={mp4} />

      {grain && <div aria-hidden="true" className="paper-grain-heavy absolute inset-0" />}

      {scrim === "bottom" && (
        <div
          aria-hidden="true"
          style={overlayStyle}
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent"
        />
      )}
      {scrim === "full" && (
        <div
          aria-hidden="true"
          style={overlayStyle}
          className="pointer-events-none absolute inset-0 bg-black/35"
        />
      )}

      {children != null && <div className="relative z-10 h-full w-full">{children}</div>}
    </FullBleedSection>
  );
}
