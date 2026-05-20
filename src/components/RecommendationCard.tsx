import type { Brand } from "@/data/types";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useWatchlist, watchlistStore } from "@/data/store";

export function RecommendationCard({ brand }: { brand: Brand }) {
  const items = useWatchlist();
  const isWatched = items.some((w) => w.brandId === brand.id);

  const onToggle = () => {
    if (isWatched) {
      watchlistStore.remove(brand.id);
      toast(`${brand.name} removed from watchlist`);
    } else {
      watchlistStore.add(brand.id);
      toast.success(`${brand.name} added to watchlist`);
    }
  };

  return (
    <section className="border border-border bg-card px-6 py-8 md:px-10 md:py-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <p className="eyebrow">Editor's note</p>
          <h2 className="mt-3 font-serif text-3xl leading-[1.1] md:text-4xl">
            {brand.headline}
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            Based on cadence, inventory, and market signals around{" "}
            <span className="text-foreground">{brand.name}</span>.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 md:shrink-0">
          <Button
            onClick={onToggle}
            variant={isWatched ? "outline" : "default"}
            className="rounded-none"
          >
            {isWatched ? "Remove from watchlist" : "Add to watchlist"}
          </Button>
          <Button variant="outline" className="rounded-none" onClick={() => toast("Saved for later")}>
            Save signal
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
