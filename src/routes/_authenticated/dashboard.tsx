import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageLayout, SectionRule } from "@/components/PageLayout";
import { brands } from "@/data/brands";
import { BrandCard } from "@/components/BrandCard";
import type { Category } from "@/data/types";
import { cn } from "@/lib/utils";
import { loadSetup } from "@/data/setupStorage";
import { mapSetupCategories, matchesSelection } from "@/data/categoryMap";

export const Route = createFileRoute("/_authenticated/dashboard")({
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
  const [houses, setHouses] = useState<Set<string>>(new Set());
  const [mappedCats, setMappedCats] = useState<Set<Category>>(new Set());
  const [houseCount, setHouseCount] = useState(0);
  const [catCount, setCatCount] = useState(0);
  const [hasSetup, setHasSetup] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);

  useEffect(() => {
    const s = loadSetup();
    if (!s) return;
    setHasSetup(true);
    setHouses(new Set(s.houses));
    setMappedCats(mapSetupCategories(s.categories));
    setHouseCount(s.houses.length);
    setCatCount(s.categories.length);
  }, []);

  const matchedIds = useMemo(() => {
    const ids = new Set<string>();
    if (!hasSetup) return ids;
    for (const b of brands) {
      if (matchesSelection(b, houses, mappedCats)) ids.add(b.id);
    }
    return ids;
  }, [hasSetup, houses, mappedCats]);

  const filtered = useMemo(() => {
    const base = brands.filter((b) => {
      const matchCat = filter === "All" || b.category === filter;
      const matchQ = !q || b.name.toLowerCase().includes(q.toLowerCase()) || b.tagline.toLowerCase().includes(q.toLowerCase());
      const matchMine = !onlyMine || matchedIds.has(b.id);
      return matchCat && matchQ && matchMine;
    });
    if (!hasSetup) return base;
    return [...base].sort((a, b) => {
      const am = matchedIds.has(a.id) ? 0 : 1;
      const bm = matchedIds.has(b.id) ? 0 : 1;
      return am - bm;
    });
  }, [filter, q, onlyMine, matchedIds, hasSetup]);

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

      <div className="mt-10 flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {hasSetup ? (
          <p>
            Personalised from your setup · {houseCount} {houseCount === 1 ? "house" : "houses"} · {catCount} {catCount === 1 ? "category" : "categories"}
          </p>
        ) : (
          <p>Personalise this feed</p>
        )}
        <Link to="/setup" className="underline-offset-4 hover:text-foreground hover:underline">
          {hasSetup ? "Edit" : "Set up signals"}
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
          {hasSetup && (
            <button
              onClick={() => setOnlyMine((v) => !v)}
              className={cn(
                "border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors",
                onlyMine
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
              )}
            >
              Only my selections
            </button>
          )}
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
        <div className="py-16 text-center text-sm text-muted-foreground">
          {onlyMine ? (
            <p>
              Nothing in your selections today.{" "}
              <button onClick={() => setOnlyMine(false)} className="underline underline-offset-4 hover:text-foreground">
                Loosen the filter
              </button>{" "}
              or{" "}
              <Link to="/setup" className="underline underline-offset-4 hover:text-foreground">
                edit your setup
              </Link>
              .
            </p>
          ) : (
            <p>No houses match that read.</p>
          )}
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {filtered.map((b) => (
            <BrandCard key={b.id} brand={b} forYou={hasSetup && matchedIds.has(b.id)} />
          ))}
        </section>
      )}
    </PageLayout>
  );
}
