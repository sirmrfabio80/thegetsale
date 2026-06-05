import { Link } from "@tanstack/react-router";
import type { Brand, WatchlistItem } from "@/data/types";
import { SignalBadge } from "./SignalBadge";
import { BrandLogo } from "./BrandLogo";
import { CardBase, CardClampedText } from "./CardBase";
import { useWatchlistMutations } from "@/data/store";
import { cn } from "@/lib/utils";
import { brandDepartment } from "@/data/categoryMap";


interface WatchlistCardProps {
  item: WatchlistItem;
  brand: Brand | null;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (brandId: string) => void;
}

export function WatchlistCard({
  item,
  brand,
  selectable,
  selected,
  onToggleSelect,
}: WatchlistCardProps) {
  const { remove, isPending } = useWatchlistMutations();

  if (!brand) {
    return (
      <article className="border border-dashed border-border bg-card px-5 py-6">
        <p className="eyebrow text-muted-foreground">Removed from tracking</p>
        <h3 className="mt-2 font-serif text-2xl leading-tight">
          We're no longer following this brand.
        </h3>
        <p className="mt-2 text-xs text-muted-foreground">
          On your watchlist since {formatDate(item.addedAt)}
        </p>
        <div className="mt-5 text-[12px]">
          <button
            onClick={() => remove(item.brandId)}
            disabled={isPending}
            className="text-foreground underline underline-offset-4 disabled:opacity-50"
          >
            Remove from watchlist
          </button>
        </div>
      </article>
    );
  }

  const stop = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const isLow = brand.signal === "low";
  const wash = isLow ? undefined : `var(--signal-${brand.signal}-wash)`;

  return (
    <CardBase
      as={Link}
      {...({ to: "/brand/$id", params: { id: brand.id } } as Record<string, unknown>)}
      signalAccent={`var(--signal-${brand.signal})`}
      wash={wash}
      className={cn(
        "md:hover:border-foreground/20",
        selected ? "border-foreground" : "border-border",
      )}
    >
      <div className="flex items-start gap-3">
        {selectable && (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={() => onToggleSelect?.(item.brandId)}
            onClick={stop}
            aria-label={`Select ${brand.name}`}
            className="mt-1 h-4 w-4 cursor-pointer accent-foreground"
          />
        )}
        <BrandLogo name={brand.name} logoUrl={brand.logoUrl} size={64} />
        <div className="flex min-w-0 flex-1 flex-col self-stretch">
          <p className="eyebrow mb-1.5 truncate">
            {(brand.categories ?? []).join(" · ") || brandDepartment(brand)}
          </p>
          <h3 className="truncate font-serif text-2xl leading-tight">{brand.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Watching since {formatDate(item.addedAt)}
          </p>
          <div className="mt-auto flex flex-wrap justify-end gap-2 pt-3">
            <SignalBadge signal={brand.signal} />
          </div>
        </div>
      </div>

      <div className="hairline my-5" />

      <CardClampedText
        className="text-sm leading-relaxed text-foreground/90"
        lineHeightEm={1.625}
      >
        {brand.headline}
      </CardClampedText>

      <div className="mt-4 border-l-2 border-border pl-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Why this is on top
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-foreground/80">
          {signalPhrase(brand.signal)} · {brand.confidence}% confidence ·{" "}
          {windowPhrase(brand.windowDays)}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-end pt-5 text-[12px]">
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            remove(item.brandId, brand.name);
          }}
          disabled={isPending}
          className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    </CardBase>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function signalPhrase(signal: "soon" | "hold" | "buy" | "low") {
  switch (signal) {
    case "soon":
      return "Wait for sale";
    case "buy":
      return "Buy now";
    case "hold":
      return "Hold for now";
    case "low":
      return "No clear read";
  }
}

function windowPhrase(days: number) {
  if (days <= 0) return "Window open now";
  if (days < 14) return `~${days} days out`;
  const weeks = Math.round(days / 7);
  return `~${weeks} ${weeks === 1 ? "week" : "weeks"} out`;
}
