import type { Brand } from "@/data/types";

import { Button } from "@/components/ui/button";
import { BrandLogo } from "./BrandLogo";
import { useWatchlist, useWatchlistMutations } from "@/data/store";

export function RecommendationCard({ brand }: { brand: Brand }) {
  const items = useWatchlist();
  const isWatched = items.some((w) => w.brandId === brand.id);
  const { add, remove, isPending } = useWatchlistMutations();

  const onToggle = () => {
    if (isWatched) remove(brand.id, brand.name);
    else add(brand.id, brand.name);
  };

  return (
    <section
      style={{ borderLeftColor: "var(--signal-soon)" }}
      className="border border-l-2 border-border bg-card px-6 py-8 md:px-10 md:py-10"
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <p className="eyebrow">Editor's note</p>
          <h2 className="mt-3 font-serif text-[2rem] italic leading-[1.1]">{brand.headline}</h2>
          <p className="mt-4 text-sm text-muted-foreground">
            Based on cadence, inventory, and market signals around{" "}
            <span className="text-foreground">{brand.name}</span>.
            {isWatched
              ? " We'll keep watching and surface the read when the window opens."
              : " Add to your watchlist to follow the next move."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 md:shrink-0">
          <Button
            onClick={onToggle}
            disabled={isPending}
            variant={isWatched ? "outline" : "default"}
            className="rounded-none"
          >
            {isWatched ? "Remove from watchlist" : "Add to watchlist"}
          </Button>
        </div>
      </div>
    </section>
  );
}

export function ConfidenceMeter({ value }: { value: number }) {
  return (
    <div className="mt-2 h-px w-40 bg-border">
      <div
        className="h-px bg-foreground"
        style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
      />
    </div>
  );
}
