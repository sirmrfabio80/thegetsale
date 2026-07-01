import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FullBleedSectionProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  as?: "section" | "div" | "header";
}

/**
 * Breaks out of any max-width container to span the full viewport width
 * without introducing a horizontal scrollbar. Uses the standard
 * `left-1/2 right-1/2 -mx-[50vw] w-screen` trick.
 *
 * Used by the marketing Hero and dashboard EditorialBand so full-bleed
 * banners share one implementation.
 */
export const FullBleedSection = forwardRef<HTMLElement, FullBleedSectionProps>(
  function FullBleedSection(
    { children, className, style, ariaLabel, as = "section" },
    ref,
  ) {
    const Tag = as as "section";
    return (
      <Tag
        ref={ref as never}
        aria-label={ariaLabel}
        className={cn(
          "relative left-1/2 right-1/2 -mx-[50vw] w-screen max-w-none overflow-hidden",
          className,
        )}
        style={style}
      >
        {children}
      </Tag>
    );
  },
);
