import type {
  ComponentPropsWithoutRef,
  CSSProperties,
  ElementType,
  ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Shared shell for grid cards (BrandCard, WatchlistCard, …).
 *
 * Guarantees:
 *  - `h-full` + `flex flex-col` so every card in a grid row stretches to the
 *    tallest sibling.
 *  - Hairline border + warm card surface that matches the editorial system.
 *  - Optional `signalAccent` (left border color) and `wash` (background tint)
 *    driven by the brand's signal token.
 *
 * Polymorphic via `as` so the same shell can render as a TanStack `Link`,
 * `article`, `button`, etc. without duplicating layout rules.
 */
type CardBaseOwnProps<T extends ElementType> = {
  as?: T;
  signalAccent?: string;
  wash?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export type CardBaseProps<T extends ElementType = "article"> = CardBaseOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof CardBaseOwnProps<T>>;

export function CardBase<T extends ElementType = "article">({
  as,
  signalAccent,
  wash,
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
        "group flex h-full flex-col border border-l-2 border-border bg-card px-5 py-6 transition-all",
        className,
      )}
    >
      {children}
    </Comp>
  );
}


/**
 * Paragraph that always reserves exactly N lines of vertical space and clamps
 * longer copy with an ellipsis. Use for card descriptions/taglines so cards
 * never collapse when copy is short.
 *
 * Only `lines={2}` is wired today — Tailwind v4 needs literal `line-clamp-*`
 * class names, so widen with care.
 */
export function CardClampedText({
  children,
  lines = 2,
  lineHeightEm = 1.5,
  className,
}: {
  children: ReactNode;
  lines?: 2;
  lineHeightEm?: number;
  className?: string;
}) {
  const hasContent =
    children !== null && children !== undefined && children !== false && children !== "";
  return (
    <p
      className={cn("line-clamp-2", className)}
      style={{ minHeight: `calc(${lines} * ${lineHeightEm}em)` }}
    >
      {hasContent ? children : "\u00A0"}
    </p>
  );
}
