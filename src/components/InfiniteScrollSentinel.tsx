import { forwardRef } from "react";

type Props = {
  done: boolean;
  loadedLabel: string;
  doneLabel?: string;
};

/**
 * Visual footer for an infinite-scroll list. Place this AFTER the grid and
 * attach the ref returned by useInfiniteCount.
 */
export const InfiniteScrollSentinel = forwardRef<HTMLDivElement, Props>(
  function InfiniteScrollSentinel({ done, loadedLabel, doneLabel }, ref) {
    return (
      <div className="mt-10 flex flex-col items-center gap-2 py-4">
        <p className="eyebrow [font-variant-numeric:tabular-nums]">{loadedLabel}</p>
        {!done ? (
          <div
            ref={ref}
            aria-hidden
            className="flex h-8 items-center text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/60" />
            <span className="ml-2">Loading more</span>
          </div>
        ) : doneLabel ? (
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
            {doneLabel}
          </p>
        ) : null}
      </div>
    );
  },
);
