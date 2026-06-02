import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { PageLayout, SectionRule } from "@/components/PageLayout";
import { BrandCard } from "@/components/BrandCard";
import { SignalDistribution } from "@/components/SignalDistribution";
import { EditorialBand } from "@/components/dashboard/EditorialBand";
import { InfiniteScrollSentinel } from "@/components/InfiniteScrollSentinel";
import { useInfiniteCount } from "@/hooks/use-infinite-count";
import type { Brand, Category } from "@/data/types";
import { cn } from "@/lib/utils";
import { DEPARTMENT_OPTIONS, type Department, type StylePreference } from "@/data/setupStorage";
import { setupQueryOptions, useSetup, useSetupMutation } from "@/data/setupStore";
import { mapSetupCategories, matchesSelection, brandDepartment } from "@/data/categoryMap";
import { styleScore } from "@/data/styles";
import { listHousesForDashboard, type HouseDashboardDTO } from "@/lib/brands.functions";
import { watchlistQueryOptions } from "@/data/store";

const PAGE_SIZE = 12;

type DashboardSearch = Record<string, never>;

const housesQueryOptions = queryOptions({
  queryKey: ["houses", "dashboard"],
  queryFn: () => listHousesForDashboard(),
});

function toBrand(h: HouseDashboardDTO): Brand {
  return {
    id: h.id,
    name: h.name,
    categories: ((h.categories ?? []) as Category[]).length > 0
      ? (h.categories as Category[])
      : (["Womens"] as Category[]),
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
    websiteUrl: h.websiteUrl,
    logoUrl: h.logoUrl,
  };
}

export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: (): DashboardSearch => ({}),
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
  const { data: dashboard } = useSuspenseQuery(housesQueryOptions);
  const houseDTOs = dashboard.houses;
  const needsMarket = dashboard.needsMarket;
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

  // No-ops kept to preserve existing call sites that "reset to first page"
  // when filters change. Infinite scroll resets via useInfiniteCount deps.
  const resetPage = () => {};



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
      const matchCat = filter === "All" || (b.categories ?? []).includes(filter);
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
    resetPage();
  };

  const handleSetFilter = (f: "All" | Category) => {
    setFilter(f);
    resetPage();
  };

  const handleSearchChange = (value: string) => {
    setQ(value);
    resetPage();
  };

  const handleToggleOnlyMine = () => {
    setOnlyMine((v) => !v);
    resetPage();
  };

  const handleClearDepartments = () => {
    setDepartments(new Set());
    resetPage();
  };

  const { count: visibleCount, sentinelRef, done } = useInfiniteCount(
    filtered.length,
    PAGE_SIZE,
    [filter, q, onlyMine, departments, hasSetup, brands.length],
  );
  const visible = filtered.slice(0, visibleCount);

  const counts = useMemo(() => {
    const wait = brands.filter((b) => b.signal === "soon").length;
    const buy = brands.filter((b) => b.signal === "buy").length;
    const hold = brands.filter((b) => b.signal === "hold").length;
    const low = brands.filter((b) => b.signal === "low").length;
    return { total: brands.length, wait, buy, hold, low };
  }, [brands]);


  return (
    <PageLayout>
      {needsMarket && (
        <section className="mt-10 border border-foreground/20 bg-muted/40 p-5 md:p-6">
          <p className="eyebrow">Set your market</p>
          <p className="mt-2 max-w-xl text-sm text-foreground">
            Sale windows differ by country. Choose your market in your profile to see the right
            read.
          </p>
          <Link
            to="/profile"
            className="mt-4 inline-flex h-10 items-center border border-foreground px-4 text-[11px] uppercase tracking-[0.18em] hover:bg-foreground hover:text-background"
          >
            Set your market
          </Link>
        </section>
      )}
      <EditorialBand eyebrow="The Read · Today" headline="Your buy/wait read." />

      <section className="mt-6">
        <p className="max-w-xl text-muted-foreground">
          {counts.total > 0
            ? `${counts.total} ${counts.total === 1 ? "house" : "houses"}, watched closely. ${counts.wait} suggest waiting, ${counts.buy} suggest acting now.`
            : "We'll surface the read across the fashion houses you follow."}
        </p>
        {counts.total > 0 && (
          <div className="mt-8 space-y-3">
            <SignalDistribution counts={counts} />
            <p className="eyebrow [font-variant-numeric:tabular-nums]">
              {counts.buy} Buy · {counts.wait} Soon · {counts.hold} Hold · {counts.low} Low
            </p>
          </div>
        )}
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
            onClick={handleClearDepartments}
            className="px-2 py-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => handleSetFilter(f)}
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
              onClick={handleToggleOnlyMine}
              className={cn(
                "border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors",
                onlyMine
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
              )}
            >
              My Houses
            </button>
          )}
        </div>
        <input
          value={q}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search a brand…"
          className="w-full border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none md:w-64"
        />
      </div>

      <SectionRule />

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {onlyMine ? (
            <p>
              None of your brands match right now.{" "}
              <button
                onClick={handleToggleOnlyMine}
                className="underline underline-offset-4 hover:text-foreground"
              >
                See all brands
              </button>{" "}
              or{" "}
              <Link to="/setup" className="underline underline-offset-4 hover:text-foreground">
                edit your setup
              </Link>
              .
            </p>
          ) : (
            <p>No brands match — try a different filter or search.</p>
          )}
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {visible.map((b, i) => (
              <BrandCard
                key={b.id}
                brand={b}
                forYou={hasSetup && matchedIds.has(b.id)}
                revealIndex={i}
              />
            ))}
          </section>

          <InfiniteScrollSentinel
            ref={sentinelRef}
            done={done}
            loadedLabel={`Showing ${visible.length} of ${filtered.length} ${filtered.length === 1 ? "brand" : "brands"}`}
            doneLabel="You're all caught up"
          />
        </>
      )}

    </PageLayout>
  );
}
