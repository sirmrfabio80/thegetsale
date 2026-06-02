import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Infinite-scroll counter. Returns:
 *  - count: current items to render
 *  - sentinelRef: ref to attach to a bottom-of-list element
 *  - loadMore: manual fallback
 *  - done: count has reached total
 *  - loading: a load step is in flight (briefly true during each batch grow)
 *
 * Guarded against rapid repeat triggers via a short cooldown so the
 * IntersectionObserver does not fire multiple times for the same intersection.
 *
 * Reset semantics: `resetKey` should ONLY contain user-driven filter inputs
 * (search, category, etc.) — not `total`. The hook clamps `count` when total
 * shrinks via a separate effect, so changes to total during a session do not
 * reset the scroll position.
 */
export function useInfiniteCount(
  total: number,
  step = 12,
  resetKey: ReadonlyArray<unknown> = [],
) {
  const [count, setCount] = useState(() => Math.min(step, Math.max(0, total)));
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const cooldownRef = useRef(false);

  // Reset when user-driven inputs change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setCount(Math.min(step, Math.max(0, total)));
    setLoading(false);
    cooldownRef.current = false;
  }, resetKey);

  // Clamp when total shrinks. Never resets to `step`; just trims overflow.
  useEffect(() => {
    setCount((c) => {
      const clamped = Math.min(c, Math.max(0, total));
      return clamped === c ? c : clamped;
    });
  }, [total]);

  const triggerLoadMore = useCallback(() => {
    if (cooldownRef.current) return;
    setCount((c) => {
      if (c >= total) return c;
      cooldownRef.current = true;
      setLoading(true);
      // Release the cooldown and loading flag after the new batch has rendered.
      window.setTimeout(() => {
        cooldownRef.current = false;
        setLoading(false);
      }, 220);
      return Math.min(c + step, total);
    });
  }, [step, total]);

  const loadMore = useCallback(() => {
    triggerLoadMore();
  }, [triggerLoadMore]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    if (count >= total) return;
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            triggerLoadMore();
            break;
          }
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [count, total, triggerLoadMore]);

  return {
    count: Math.min(count, total),
    sentinelRef,
    loadMore,
    done: count >= total,
    loading,
  };
}
