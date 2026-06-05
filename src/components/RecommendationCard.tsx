import type { Brand } from "@/data/types";

import { Button } from "@/components/ui/button";
import { BrandLogo } from "./BrandLogo";
import { CardBase, CardClampedText, CARD_FOCUS_RING } from "./CardBase";
import { cn } from "@/lib/utils";
import { useWatchlist, useWatchlistMutations } from "@/data/store";

export function RecommendationCard({ brand }: { brand: Brand }) {
  const items = useWatchlist();
  const isWatched = items.some((w) => w.brandId === brand.id);
  const { add, remove, isPending } = useWatchlistMutations();

  const onToggle = () => {
    if (isWatched) remove(brand.id, brand.name);
    else add(brand.id, brand.name);
  };

  const isLow = brand.signal === "low";
  const wash = isLow ? undefined : `var(--signal-${brand.signal}-wash)`;

  return (
    <CardBase
      as="section"
      padding="hero"
      interactive={false}
      signalAccent={`var(--signal-${brand.signal})`}
      wash={wash}
    >
      <div className="flex flex-1 flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex max-w-xl items-start gap-4">
          <BrandLogo name={brand.name} logoUrl={brand.logoUrl} size={64} />
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Editor's note</p>
            <CardClampedText
              as="h2"
              lines={2}
              lineHeightEm={1.1}
              className="mt-2 font-serif text-[2rem] italic leading-[1.1]"
            >
              {brand.headline}
            </CardClampedText>
            <CardClampedText
              lines={3}
              lineHeightEm={1.5}
              className="mt-4 text-sm text-muted-foreground"
            >
              <>
                Based on cadence, inventory, and market signals around{" "}
                <span className="text-foreground">{brand.name}</span>.
                {isWatched
                  ? " We'll keep watching and surface the read when the window opens."
                  : " Add to your watchlist to follow the next move."}
              </>
            </CardClampedText>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 md:shrink-0">
          <Button
            onClick={onToggle}
            disabled={isPending}
            variant={isWatched ? "outline" : "default"}
            aria-pressed={isWatched}
            aria-label={isWatched ? `Remove ${brand.name} from watchlist` : `Add ${brand.name} to watchlist`}
            className={cn("rounded-none", CARD_FOCUS_RING)}
          >
            {isWatched ? "Remove from watchlist" : "Add to watchlist"}
          </Button>
        </div>
      </div>
    </CardBase>
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
