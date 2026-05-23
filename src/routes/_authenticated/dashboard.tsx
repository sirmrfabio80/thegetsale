import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { PageLayout, SectionRule } from "@/components/PageLayout";
import { BrandCard } from "@/components/BrandCard";
import type { Brand, Category } from "@/data/types";
import { cn } from "@/lib/utils";
import { DEPARTMENT_OPTIONS, type Department, type StylePreference } from "@/data/setupStorage";
import { setupQueryOptions, useSetup, useSetupMutation } from "@/data/setupStore";
import { mapSetupCategories, matchesSelection, brandDepartment } from "@/data/categoryMap";
import { styleScore } from "@/data/styles";
import { listHousesForDashboard, type HouseDashboardDTO } from "@/lib/brands.functions";
import { watchlistQueryOptions } from "@/data/store";

const housesQueryOptions = queryOptions({
  queryKey: ["houses", "dashboard"],
  queryFn: () => listHousesForDashboard(),
});

function toBrand(h: HouseDashboardDTO): Brand {
  return {
    id: h.id,
    name: h.name,
    category: (h.category as Category) || "Womens",
    tagline: h.tagline,
    signal: h.signal,
    headline: h.headline,
    confidence: h.confidenceScore,
    windowDays: h.windowDays ?? 999,
    lastSaleDays: h.lastSaleDays ?? 0,
    expectedDepth: h.expectedDepth,
    cadence: h.cadence ?? "",
    factors: [],
    history: [],
  };
}

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Signals — The Get" },
      { name: "description", content: "Today's quiet read on the brands worth watching." },
    ],
  }),
  loader: ({ context }) => {
    // Auth context is "loading" during SSR (no client session yet). Skip
    // protected query prefetch on the server; useSuspenseQuery will fetch
    // on the client once the session is hydrated.
    if (context.auth?.status !== "authenticated") return null;
    return Promise.all([
      context.queryClient.ensureQueryData(housesQueryOptions),
      context.queryClient.ensureQueryData(watchlistQueryOptions),
      context.queryClient.ensureQueryData(setupQueryOptions),
    ]);
  },
  component: Dashboard,
});

const FILTERS: Array<"All" | Category> = [
  "All",
  "Womens",
  "Mens",
  "Accessories",
  "Footwear",
  "Jewellery",
];

function Dashboard() {
  const { data: houseDTOs } = useSuspenseQuery(housesQueryOptions);
  const brands = useMemo(() => houseDTOs.map(toBrand), [houseDTOs]);
  const { setup } = useSetup();
  const { save } = useSetupMutation();
  const [filter, setFilter] = useState<"All" | Category>("All");
  const [q, setQ] = useState("");
  const [houses, setHouses] = useState<Set<string>>(new Set());
  const [mappedCats, setMappedCats] = useState<Set<Category>>(new Set());
  const [houseCount, setHouseCount] = useState(0);
  const [catCount, setCatCount] = useState(0);
  const [hasSetup, setHasSetup] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [styles, setStyles] = useState<StylePreference[]>([]);
  const [departments, setDepartments] = useState<Set<Department>>(new Set());

  // Sync derived filter state from the backend-backed setup record.
  useEffect(() => {
    if (!setup) {
      setHasSetup(false);
      return;
    }
    setHasSetup(true);
    setHouses(new Set(setup.houses));
    setMappedCats(mapSetupCategories(setup.categories));
    setHouseCount(setup.houses.length);
    setCatCount(setup.categories.length);
    setStyles((setup.styles ?? []) as StylePreference[]);
    setDepartments(new Set((setup.departments ?? []) as Department[]));
  }, [setup]);

  // Persist department filter changes back to setup so the Edit flow
  // preselects them in the setup page.
  useEffect(() => {
    if (!hasSetup || !setup) return;
    const current = (setup.departments ?? []) as Department[];
    const next = [...departments];
    if (current.length === next.length && current.every((d) => departments.has(d))) return;
    save({ departments: next });
  }, [hasSetup, departments, setup, save]);

  const matchedIds = useMemo(() => {
    const ids = new Set<string>();
    if (!hasSetup) return ids;
    for (const b of brands) {
      if (matchesSelection(b, houses, mappedCats)) ids.add(b.id);
    }
    return ids;
  }, [hasSetup, houses, mappedCats, brands]);

  const filtered = useMemo(() => {
    const base = brands.filter((b) => {
      const matchCat = filter === "All" || b.category === filter;
      const matchQ =
        !q ||
        b.name.toLowerCase().includes(q.toLowerCase()) ||
        b.tagline.toLowerCase().includes(q.toLowerCase());
      const matchMine = !onlyMine || matchedIds.has(b.id);
      const matchDept = departments.size === 0 || departments.has(brandDepartment(b));
      return matchCat && matchQ && matchMine && matchDept;
    });
    if (!hasSetup) return base;
    return [...base].sort((a, b) => {
      const am = matchedIds.has(a.id) ? 0 : 1;
      const bm = matchedIds.has(b.id) ? 0 : 1;
      if (am !== bm) return am - bm;
      // Tie-break by style affinity so the dashboard feels tuned.
      return styleScore(b.tagline, styles) - styleScore(a.tagline, styles);
    });
  }, [filter, q, onlyMine, matchedIds, hasSetup, styles, departments, brands]);

  const toggleDepartment = (d: Department) => {
    setDepartments((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  const counts = useMemo(() => {
    const wait = brands.filter((b) => b.signal === "soon").length;
    const buy = brands.filter((b) => b.signal === "buy").length;
    return { total: brands.length, wait, buy };
  }, [brands]);

  return (
    <PageLayout>
      <section className="pt-16 md:pt-24">
        <p className="eyebrow">Today's signals</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Your buy/wait read.</h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          {counts.total > 0
            ? `${counts.total} ${counts.total === 1 ? "house" : "houses"}, watched closely. ${counts.wait} suggest waiting, ${counts.buy} suggest acting now.`
            : "We'll surface the read across the fashion houses you follow."}
        </p>
      </section>

      <div className="mt-10 flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {hasSetup ? (
          <p>
            Personalised · {houseCount} {houseCount === 1 ? "house" : "houses"} · {catCount}{" "}
            {catCount === 1 ? "category" : "categories"}
            {styles.length > 0
              ? ` · Tuned to ${styles.slice(0, 2).join(", ")}${styles.length > 2 ? "…" : ""}`
              : ""}
          </p>
        ) : (
          <p>Personalise this feed</p>
        )}

        <Link to="/setup" className="underline-offset-4 hover:text-foreground hover:underline">
          {hasSetup ? "Edit" : "Set up signals"}
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Department
        </span>
        {DEPARTMENT_OPTIONS.map(({ value }) => {
          const active = departments.has(value);
          return (
            <button
              key={value}
              onClick={() => toggleDepartment(value)}
              aria-pressed={active}
              className={cn(
                "border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
              )}
            >
              {value}
            </button>
          );
        })}
        {departments.size > 0 && (
          <button
            onClick={() => setDepartments(new Set())}
            className="px-2 py-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Clear
          </button>
        )}
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
              <button
                onClick={() => setOnlyMine(false)}
                className="underline underline-offset-4 hover:text-foreground"
              >
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
