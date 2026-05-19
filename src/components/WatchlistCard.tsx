import { Link } from "@tanstack/react-router";
import type { WatchlistItem } from "@/data/types";
import { getBrand } from "@/data/brands";
import { SignalBadge } from "./SignalBadge";
import { watchlistStore } from "@/data/store";
import { toast } from "sonner";

export function WatchlistCard({ item }: { item: WatchlistItem }) {
  const brand = getBrand(item.brandId);
  if (!brand) return null;

  return (
    <article className="group border border-border bg-card px-5 py-6 transition-all md:hover:border-foreground/20">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow mb-2">{brand.category}</p>
          <h3 className="truncate font-serif text-2xl leading-tight">{brand.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Watching since {formatDate(item.addedAt)}
          </p>
        </div>
        <SignalBadge signal={brand.signal} />
      </div>

      <div className="hairline my-5" />

      <p className="text-sm leading-relaxed text-foreground/90">{brand.headline}</p>

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
