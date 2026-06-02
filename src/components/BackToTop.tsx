import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  /** Pixels scrolled before showing. */
  threshold?: number;
};

/**
 * Subtle floating "Back to top" button. Appears after the user scrolls down
 * past `threshold` and quietly fades away near the top of the page. Designed
 * to sit out of the way on mobile while infinite-scroll feeds grow.
 */
export function BackToTop({ threshold = 720 }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    const update = () => {
      raf = 0;
      setVisible(window.scrollY > threshold);
    };
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [threshold]);

  const onClick = () => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={onClick}
      tabIndex={visible ? 0 : -1}
      className={cn(
        "fixed bottom-5 right-5 z-40 inline-flex h-11 w-11 items-center justify-center",
        "border border-foreground/20 bg-background/85 text-foreground shadow-sm backdrop-blur",
        "transition-all duration-200 ease-out",
        "hover:border-foreground hover:bg-foreground hover:text-background",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40",
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0",
        "md:bottom-8 md:right-8",
      )}
    >
      <ArrowUp className="h-4 w-4" aria-hidden />
    </button>
  );
}
