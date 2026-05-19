import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageLayout, SectionRule } from "@/components/PageLayout";
import { brands } from "@/data/brands";
import { BrandCard } from "@/components/BrandCard";
import type { Category } from "@/data/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Signals — The Get" },
      { name: "description", content: "Today's quiet read on the brands worth watching." },
    ],
  }),
  component: Dashboard,
});

const FILTERS: Array<"All" | Category> = ["All", "Womens", "Mens", "Accessories", "Footwear", "Jewellery"];

function Dashboard() {
  const [filter, setFilter] = useState<"All" | Category>("All");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return brands.filter((b) => {
      const matchCat = filter === "All" || b.category === filter;
      const matchQ = !q || b.name.toLowerCase().includes(q.toLowerCase()) || b.tagline.toLowerCase().includes(q.toLowerCase());
      return matchCat && matchQ;
    });
  }, [filter, q]);

  return (
    <PageLayout>
      <section className="pt-16 md:pt-24">
        <p className="eyebrow">Today's signals</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">
          A quiet read on the market.
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Eight houses, watched closely. Three suggest waiting, two suggest acting now.
        </p>
      </section>

      <div className="mt-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
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
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a house…"
          className="w-full border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none md:w-64"
        />
      </div>

      <SectionRule />

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No houses match that read.</p>
      ) : (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {filtered.map((b) => (
            <BrandCard key={b.id} brand={b} />
          ))}
        </section>
      )}
    </PageLayout>
  );
}
