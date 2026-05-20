import { Link } from "@tanstack/react-router";
import type { Brand } from "@/data/types";
import { SignalBadge } from "./SignalBadge";
import { useWatchlist, useWatchlistMutations } from "@/data/store";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { brandDepartment } from "@/data/categoryMap";

export function BrandCard({ brand, forYou = false }: { brand: Brand; forYou?: boolean }) {
  const items = useWatchlist();
  const isWatched = items.some((w) => w.brandId === brand.id);
  const { add, remove, isPending } = useWatchlistMutations();

  const onToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isWatched) remove(brand.id, brand.name);
    else add(brand.id, brand.name);
  };

  return (
    <div className="relative">
      <Link
        to="/brand/$id"
        params={{ id: brand.id }}
        className="group block border border-border bg-card px-5 py-6 transition-all md:hover:-translate-y-px md:hover:border-foreground/20"
      >
        <div className="flex items-start justify-between gap-4 pr-10">
          <div>
            <p className="eyebrow mb-2">
              {brand.category} <span className="text-muted-foreground/60">·</span> {brandDepartment(brand)}
            </p>
            <h3 className="font-serif text-2xl leading-tight">{brand.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{brand.tagline}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <SignalBadge signal={brand.signal} />
            {forYou && (
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                For you
              </span>
            )}
          </div>
        </div>

        <div className="hairline mt-6" />

        <div className="mt-5 grid grid-cols-3 gap-4 text-[12px]">
          <Stat label="Confidence" value={`${brand.confidence}%`} />
          <Stat label="Window" value={brand.windowDays > 90 ? "—" : `${brand.windowDays}d`} />
          <Stat label="Depth" value={brand.expectedDepth} />
        </div>
      </Link>

      <button
        type="button"
        onClick={onToggle}
        aria-pressed={isWatched}
        aria-label={isWatched ? `Remove ${brand.name} from watchlist` : `Add ${brand.name} to watchlist`}
        title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
        className={cn(
          "absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center border border-border bg-background transition-colors hover:border-foreground",
          isWatched && "border-foreground bg-foreground text-background hover:opacity-90",
        )}
      >
        <Bookmark
          className={cn("h-3.5 w-3.5", isWatched && "fill-current")}
          aria-hidden
        />
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow mb-1">{label}</p>
      <p className="font-serif text-lg">{value}</p>
    </div>
  );
}
