import { Link } from "@tanstack/react-router";
import type { WatchlistItem } from "@/data/types";
import { getBrand } from "@/data/brands";
import { SignalBadge } from "./SignalBadge";
import { watchlistStore } from "@/data/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { brandDepartment } from "@/data/categoryMap";

interface WatchlistCardProps {
  item: WatchlistItem;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (brandId: string) => void;
}

export function WatchlistCard({ item, selectable, selected, onToggleSelect }: WatchlistCardProps) {
  const brand = getBrand(item.brandId);
  if (!brand) return null;

  return (
    <article
      className={cn(
        "group relative border bg-card px-5 py-6 transition-all md:hover:border-foreground/20",
        selected ? "border-foreground" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {selectable && (
            <input
              type="checkbox"
              checked={!!selected}
              onChange={() => onToggleSelect?.(item.brandId)}
              aria-label={`Select ${brand.name}`}
              className="mt-1 h-4 w-4 cursor-pointer accent-foreground"
            />
          )}
          <div className="min-w-0">
            <p className="eyebrow mb-2">{brand.category} · {brandDepartment(brand)}</p>
            <h3 className="truncate font-serif text-2xl leading-tight">{brand.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Watching since {formatDate(item.addedAt)}
            </p>
          </div>
        </div>
        <SignalBadge signal={brand.signal} />
      </div>

      <div className="hairline my-5" />

      <p className="text-sm leading-relaxed text-foreground/90">{brand.headline}</p>

      <div className="mt-4 border-l-2 border-border pl-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Why this is on top
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-foreground/80">
          {signalPhrase(brand.signal)} · {brand.confidence}% confidence · {windowPhrase(brand.windowDays)}
        </p>
      </div>


      <div className="mt-5 flex items-center justify-between text-[12px]">
        <Link
          to="/brand/$id"
          params={{ id: brand.id }}
          className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
        >
          View signal
        </Link>
        <button
          onClick={() => {
            watchlistStore.remove(item.brandId);
            toast(`${brand.name} removed from watchlist`);
          }}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          Remove
        </button>
      </div>
    </article>
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
      return "Sale likely soon";
    case "buy":
      return "Worth acting on";
    case "hold":
      return "Hold for now";
    case "low":
      return "Quiet signal";
  }
}

function windowPhrase(days: number) {
  if (days <= 0) return "Window open now";
  if (days < 14) return `~${days} days out`;
  const weeks = Math.round(days / 7);
  return `~${weeks} ${weeks === 1 ? "week" : "weeks"} out`;
}
