import { useEffect, useState } from "react";

export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState<number>(() => {
    if (typeof window === "undefined") return target;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return target;
    return 0;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      setValue(target);
      return;
    }
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
