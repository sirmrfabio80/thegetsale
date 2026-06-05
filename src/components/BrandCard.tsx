import { Link } from "@tanstack/react-router";
import type { Brand, Category, SignalKind } from "@/data/types";
import { SignalBadge } from "./SignalBadge";
import { BrandLogo } from "./BrandLogo";
import { useWatchlist, useWatchlistMutations } from "@/data/store";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { brandDepartment } from "@/data/categoryMap";
import { useReveal } from "@/hooks/use-reveal";

const SIGNAL_ACCENT: Record<SignalKind, string> = {
  buy: "var(--signal-buy)",
  soon: "var(--signal-soon)",
  hold: "var(--signal-hold)",
  low: "var(--signal-low)",
};

function formatCategories(categories: Category[] | undefined, fallback: string): string {
  const list = categories ?? [];
  if (list.length === 0) return fallback;
  if (list.length <= 3) return list.join(" · ");
  return `${list.slice(0, 3).join(" · ")} · +${list.length - 3}`;
}

interface BrandCardProps {
  brand: Brand;
  forYou?: boolean;
  revealIndex?: number;
}

export function BrandCard({ brand, forYou = false, revealIndex = 0 }: BrandCardProps) {
  const items = useWatchlist();
  const isWatched = items.some((w) => w.brandId === brand.id);
  const { add, remove, isPending } = useWatchlistMutations();
  const revealRef = useReveal<HTMLDivElement>();

  const onToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isWatched) remove(brand.id, brand.name);
    else add(brand.id, brand.name);
  };

  const eyebrow = formatCategories(brand.categories, brandDepartment(brand));
  const isLow = brand.signal === "low";
  const wash = isLow ? undefined : `var(--signal-${brand.signal}-wash)`;

  return (
    <div
      ref={revealRef}
      className="reveal-on-scroll relative h-full"
      style={{ transitionDelay: `${(revealIndex % 6) * 60}ms` }}
    >
      <Link
        to="/brand/$id"
        params={{ id: brand.id }}
        style={{
          borderLeftColor: SIGNAL_ACCENT[brand.signal],
          ...(wash ? { backgroundColor: wash } : {}),
        }}
        className={cn(
          "brand-card-link group flex h-full flex-col border border-border border-l-2 px-5 py-6 transition-all md:hover:border-foreground/20 md:hover:shadow-[var(--shadow-2)]",
          isLow && "bg-card",
        )}
      >
        {forYou && (
          <div className="mb-3">
            <span className="inline-flex h-5 items-center border border-border bg-background/60 px-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              For you
            </span>
          </div>
        )}

        <div className="flex flex-1 items-start gap-4 pr-10">
          <BrandLogo name={brand.name} logoUrl={brand.logoUrl} size={64} />
          <div className="flex min-w-0 flex-1 flex-col self-stretch">
            <p className="eyebrow mb-1.5 truncate">{eyebrow}</p>
            <h3 className="font-serif text-[1.5rem] leading-tight">{brand.name}</h3>
            <p
              className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground"
              style={{ minHeight: "calc(2 * 1.375em)" }}
            >
              {brand.tagline || "\u00A0"}
            </p>
            <div className="mt-auto flex flex-wrap justify-end gap-2 pt-3">
              <SignalBadge signal={brand.signal} />
            </div>
          </div>
        </div>

        <div className="hairline mt-6" />

        {isLow ? (
          <div className="mt-5 flex min-h-[44px] items-center text-xs text-muted-foreground">
            Awaiting signal · cadence calibrating
          </div>
        ) : (
          <div className="mt-5 grid min-h-[44px] grid-cols-3 gap-4 text-[12px]">
            <Stat label="Confidence" value={`${brand.confidence}%`} />
            <Stat label="Window" value={brand.windowDays > 90 ? "—" : `${brand.windowDays}d`} />
            <Stat label="Depth" value={brand.expectedDepth || "—"} />
          </div>
        )}
      </Link>

      <button
        type="button"
        onClick={onToggle}
        disabled={isPending}
        aria-pressed={isWatched}
        aria-label={
          isWatched ? `Remove ${brand.name} from watchlist` : `Add ${brand.name} to watchlist`
        }
        title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
        className={cn(
          "absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center border transition-colors disabled:opacity-50",
          isWatched
            ? "border-foreground bg-foreground text-background hover:opacity-90"
            : "border-border bg-background/70 text-foreground hover:bg-muted",
        )}
      >
        <Bookmark className={cn("h-4 w-4", isWatched && "fill-current")} aria-hidden />
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow mb-1">{label}</p>
      <p className="font-serif text-[1.1rem] [font-variant-numeric:tabular-nums]">{value}</p>
    </div>
  );
}
