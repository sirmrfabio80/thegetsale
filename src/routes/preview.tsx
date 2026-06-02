import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageLayout, SectionRule } from "@/components/PageLayout";
import { BrandCard } from "@/components/BrandCard";
import { SignalDistribution } from "@/components/SignalDistribution";
import { EditorialBand } from "@/components/dashboard/EditorialBand";
import { brands as mockBrands } from "@/data/brands";
import type { Category } from "@/data/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/preview")({
  head: () => ({
    meta: [
      { title: "Preview — The Get" },
      { name: "description", content: "Public preview of the editorial dashboard." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PreviewDashboard,
});

const FILTERS: Array<"All" | Category> = [
  "All",
  "Womens",
  "Mens",
  "Accessories",
  "Footwear",
  "Jewellery",
];

function PreviewDashboard() {
  const [filter, setFilter] = useState<"All" | Category>("All");

  const filtered = useMemo(
    () =>
      mockBrands.filter(
        (b) => filter === "All" || (b.categories ?? []).includes(filter),
      ),
    [filter],
  );

  const counts = useMemo(() => {
    const wait = mockBrands.filter((b) => b.signal === "soon").length;
    const buy = mockBrands.filter((b) => b.signal === "buy").length;
    const hold = mockBrands.filter((b) => b.signal === "hold").length;
    const low = mockBrands.filter((b) => b.signal === "low").length;
    return { total: mockBrands.length, wait, buy, hold, low };
  }, []);

  return (
    <PageLayout>
      <section className="mt-8 border border-border bg-muted/30 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        Preview · sample data · no sign-in required ·{" "}
        <Link to="/auth" className="underline-offset-4 hover:text-foreground hover:underline">
          Sign in for the live read
        </Link>
      </section>

      <EditorialBand eyebrow="The Read · Preview" headline="Your buy/wait read." />

      <section className="mt-6">
        <p className="max-w-xl text-muted-foreground">
          {counts.total} houses, watched closely. {counts.wait} suggest waiting, {counts.buy}{" "}
          suggest acting now.
        </p>
        <div className="mt-8 space-y-3">
          <SignalDistribution counts={counts} />
          <p className="eyebrow [font-variant-numeric:tabular-nums]">
            {counts.buy} Buy · {counts.wait} Soon · {counts.hold} Hold · {counts.low} Low
          </p>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors",
              filter === f
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <SectionRule />

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          <p>No brands match — try a different filter.</p>
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {filtered.map((b, i) => (
            <BrandCard key={b.id} brand={b} revealIndex={i} />
          ))}
        </section>
      )}
    </PageLayout>
  );
}
