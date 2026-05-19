import type { Brand } from "@/data/types";
import { SignalBadge } from "./SignalBadge";
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
    <section className="border border-border bg-card px-6 py-10 md:px-12 md:py-14">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl">
          <SignalBadge signal={brand.signal} />
          <h1 className="mt-5 font-serif text-4xl leading-[1.05] md:text-5xl">
            {brand.headline}
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Based on cadence, inventory, and market signals around{" "}
            <span className="text-foreground">{brand.name}</span>.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 md:items-end">
          <p className="eyebrow">Confidence</p>
          <p className="font-serif text-5xl leading-none">{brand.confidence}%</p>
          <ConfidenceMeter value={brand.confidence} />
        </div>
      </div>

      <div className="hairline my-8" />

      <div className="grid grid-cols-2 gap-6 text-sm md:grid-cols-4">
        <Field label="Expected window" value={brand.windowDays > 90 ? "No clear window" : `${brand.windowDays} days`} />
        <Field label="Expected depth" value={brand.expectedDepth} />
        <Field label="Last sale" value={`${brand.lastSaleDays} days ago`} />
        <Field label="Cadence" value={brand.cadence} />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
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
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow mb-1.5">{label}</p>
      <p className="font-serif text-lg leading-tight">{value}</p>
    </div>
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
