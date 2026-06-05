import type {
  ComponentPropsWithoutRef,
  CSSProperties,
  ElementType,
  ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Shared shell for cards across the app (BrandCard, WatchlistCard,
 * RecommendationCard, EmptyStateCard, …).
 *
 * Guarantees the cohesive premium feel:
 *  - `h-full` + `flex flex-col` so every card in a grid row stretches to the
 *    tallest sibling.
 *  - Hairline border on the warm card surface that matches the editorial system.
 *  - Optional `signalAccent` (left border color) and `wash` (background tint)
 *    driven by the brand's signal token.
 *  - Standardised hover (border darken + soft shadow lift) and active
 *    (1px press) states on every card surface.
 *
 * Polymorphic via `as` so the same shell can render as a TanStack `Link`,
 * `article`, `section`, `button`, etc. without duplicating layout rules.
 */
type CardBaseOwnProps<T extends ElementType> = {
  as?: T;
  signalAccent?: string;
  wash?: string;
  /**
   * `default` = standard grid card padding (px-5 py-6).
   * `hero` = larger, editorial padding for full-width strips.
   * `empty` = airy empty-state padding (px-8 py-20).
   */
  padding?: "default" | "hero" | "empty";
  /**
   * `solid` = standard hairline border. `dashed` = empty-state treatment.
   */
  borderStyle?: "solid" | "dashed";
  /**
   * Disable hover/active treatment for non-interactive surfaces.
   */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export type CardBaseProps<T extends ElementType = "article"> = CardBaseOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof CardBaseOwnProps<T>>;

const PADDING_CLASS: Record<NonNullable<CardBaseOwnProps<"article">["padding"]>, string> = {
  default: "px-5 py-6",
  hero: "px-6 py-8 md:px-10 md:py-10",
  empty: "px-8 py-20",
};

export function CardBase<T extends ElementType = "article">({
  as,
  signalAccent,
  wash,
  padding = "default",
  borderStyle = "solid",
  interactive = true,
  className,
  style,
  children,
  ...rest
}: CardBaseProps<T>) {
  const Comp = (as ?? "article") as ElementType;
  return (
    <Comp
      {...rest}
      style={{
        ...(signalAccent ? { borderLeftColor: signalAccent } : {}),
        ...(wash ? { backgroundColor: wash } : {}),
        ...style,
      }}
      className={cn(
        // Layout + surface
        "group flex h-full flex-col border border-l-2 border-border bg-card",
        // Padding tier
        PADDING_CLASS[padding],
        // Motion
        "transition-[border-color,box-shadow,transform] duration-200 ease-out",
        // Empty / decorative variant
        borderStyle === "dashed" && "border-dashed bg-card/40",
        // Standardised interactive feedback (hover, press, keyboard focus)
        interactive &&
          "cursor-pointer md:hover:border-foreground/20 md:hover:shadow-[var(--shadow-2)] active:translate-y-px focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      {children}
    </Comp>
  );
}

/**
 * Paragraph/heading that always reserves exactly N lines of vertical space and
 * clamps longer copy with an ellipsis. Use for card headlines and descriptions
 * so cards never collapse when copy is short and never shift height when copy
 * runs long.
 *
 * Tailwind v4 needs literal `line-clamp-*` class names, so `lines` is restricted
 * to `2 | 3`. Widen with care (and a `@source inline` safelist) if needed.
 */
const CLAMP_CLASS = {
  2: "line-clamp-2",
  3: "line-clamp-3",
} as const;

export function CardClampedText<T extends ElementType = "p">({
  as,
  children,
  lines = 2,
  lineHeightEm = 1.5,
  className,
}: {
  as?: T;
  children: ReactNode;
  lines?: 2 | 3;
  lineHeightEm?: number;
  className?: string;
}) {
  const Comp = (as ?? "p") as ElementType;
  const hasContent =
    children !== null && children !== undefined && children !== false && children !== "";
  return (
    <Comp
      className={cn(CLAMP_CLASS[lines], className)}
      style={{ minHeight: `calc(${lines} * ${lineHeightEm}em)` }}
    >
      {hasContent ? children : "\u00A0"}
    </Comp>
  );
}
