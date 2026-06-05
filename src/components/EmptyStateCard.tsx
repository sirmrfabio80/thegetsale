import type { ReactNode } from "react";
import { CardBase } from "./CardBase";
import { cn } from "@/lib/utils";

/**
 * Reusable empty / zero-state surface that inherits CardBase's border, surface
 * and motion so empty states across Dashboard, Watchlist, etc. feel aligned
 * with the active cards around them.
 *
 * Renders with a dashed border + airy padding by default, centred content,
 * and an optional eyebrow / title / description / actions row.
 */
export function EmptyStateCard({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <CardBase
      padding="empty"
      borderStyle="dashed"
      interactive={false}
      className={cn("items-center text-center", className)}
    >
      {eyebrow && <p className="eyebrow text-muted-foreground">{eyebrow}</p>}
      <h2
        className={cn(
          "font-serif text-2xl leading-tight md:text-3xl",
          eyebrow ? "mt-4" : "mt-0",
        )}
      >
        {title}
      </h2>
      {description && (
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {actions && (
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {actions}
        </div>
      )}
    </CardBase>
  );
}
