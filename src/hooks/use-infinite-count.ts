import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Infinite-scroll counter. Returns the number of items to show, a sentinel
 * ref to place at the bottom of the list, and a manual loadMore for fallback.
 * Increments by `step` whenever the sentinel intersects the viewport, until
 * `total` is reached. Resets to `step` whenever any value in `resetKey` changes.
 */
export function useInfiniteCount(
  total: number,
  step = 12,
  resetKey: ReadonlyArray<unknown> = [],
) {
  const [count, setCount] = useState(() => Math.min(step, Math.max(0, total)));
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset when filters change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setCount(Math.min(step, Math.max(0, total)));
  }, resetKey);

  // Clamp when total shrinks.
  useEffect(() => {
    setCount((c) => Math.min(Math.max(step, c), Math.max(0, total)));
  }, [total, step]);

  const loadMore = useCallback(() => {
    setCount((c) => Math.min(c + step, total));
  }, [step, total]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    if (count >= total) return;
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setCount((c) => Math.min(c + step, total));
          }
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [count, total, step]);

  return { count: Math.min(count, total), sentinelRef, loadMore, done: count >= total };
}
