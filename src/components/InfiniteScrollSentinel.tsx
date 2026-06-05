import { forwardRef, useEffect, useRef, useState } from "react";

type Props = {
  done: boolean;
  loading?: boolean;
  loadedLabel: string;
  doneLabel?: string;
  doneHint?: string;
};

/**
 * Visual footer for an infinite-scroll list. Place this AFTER the grid and
 * attach the ref returned by useInfiniteCount.
 *
 * Three states:
 *  - loading more  (sentinel mounted, animated pulse + "Loading more")
 *  - resting       (sentinel mounted, just the count)
 *  - done          (sentinel removed, standardised end-of-results card)
 *
 * Accessibility:
 *  - A hidden aria-live region announces state transitions explicitly
 *    ("Loading more.", "Showing X of Y.", "You're all caught up.")
 *  - role="status" on the visual card supplies the implicit polite live
 *    region for screen readers that support it.
 */
export const InfiniteScrollSentinel = forwardRef<HTMLDivElement, Props>(
  function InfiniteScrollSentinel(
    { done, loading = false, loadedLabel, doneLabel = "You're all caught up", doneHint },
    ref,
  ) {
    // Dedicated hidden live region for screen-reader announcements.
    // Tracks previous state so we only announce meaningful transitions.
    const [announcement, setAnnouncement] = useState("");
    const prevDone = useRef(done);
    const prevLoading = useRef(loading);
    const labelRef = useRef({ loaded: loadedLabel, done: doneLabel });
    labelRef.current = { loaded: loadedLabel, done: doneLabel };

    useEffect(() => {
      if (done && !prevDone.current) {
        setAnnouncement(`${labelRef.current.done}. ${labelRef.current.loaded}.`);
      } else if (loading && !prevLoading.current && !done) {
        setAnnouncement("Loading more.");
      } else if (!loading && prevLoading.current && !done) {
        setAnnouncement(`${labelRef.current.loaded}.`);
      }
      prevDone.current = done;
      prevLoading.current = loading;
    }, [done, loading]);

    const liveRegion = (
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    );

    if (done) {
      return (
        <>
          {liveRegion}
          <div
            role="status"
            className="mt-10 flex flex-col items-center gap-2 border-t border-border/60 py-10 text-center"
          >
            <p className="eyebrow text-foreground/70">{doneLabel}</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground [font-variant-numeric:tabular-nums]">
              {loadedLabel}
            </p>
            {doneHint ? (
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground/80">
                {doneHint}
              </p>
            ) : null}
          </div>
        </>
      );
    }

    return (
      <>
        {liveRegion}
        <div className="mt-10 flex flex-col items-center gap-2 py-6" role="status">
          <p className="eyebrow [font-variant-numeric:tabular-nums]">{loadedLabel}</p>
          <div
            ref={ref}
            aria-hidden
            className="flex h-8 items-center text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            <span
              className={
                "inline-block h-1.5 w-1.5 rounded-full " +
                (loading
                  ? "animate-pulse bg-foreground/70"
                  : "bg-muted-foreground/50")
              }
            />
            <span className="ml-2">{loading ? "Loading more" : "Scroll for more"}</span>
          </div>
        </div>
      </>
    );
  },
);

