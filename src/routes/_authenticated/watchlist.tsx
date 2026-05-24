import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { PageLayout, SectionRule } from "@/components/PageLayout";
import { useWatchlist, useWatchlistMutations, watchlistQueryOptions } from "@/data/store";
import { WatchlistCard } from "@/components/WatchlistCard";
import { brandDepartment } from "@/data/categoryMap";
import { type Department } from "@/data/setupStorage";
import { setupQueryOptions, useSetup, useSetupMutation } from "@/data/setupStore";
import { cn } from "@/lib/utils";
import { listHousesForDashboard, type HouseDashboardDTO } from "@/lib/brands.functions";
import type { Brand, Category } from "@/data/types";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Single source of truth so the "Updating list…" flash settles cleanly
// after a bulk department toggle.
const BULK_TOGGLE_DEBOUNCE_MS = 300;
const PAGE_SIZE = 12;

const CATEGORY_FILTERS: Array<"All" | Category> = [
  "All",
  "Womens",
  "Mens",
  "Accessories",
  "Footwear",
  "Jewellery",
];

type WatchlistSearch = { page: number; q: string; cat: "All" | Category };

function buildPageItems(
  current: number,
  total: number,
): Array<number | "ellipsis-l" | "ellipsis-r"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: Array<number | "ellipsis-l" | "ellipsis-r"> = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) items.push("ellipsis-l");
  for (let i = left; i <= right; i++) items.push(i);
  if (right < total - 1) items.push("ellipsis-r");
  items.push(total);
  return items;
}

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
  };
}

export const Route = createFileRoute("/_authenticated/watchlist")({
  validateSearch: (raw: Record<string, unknown>): WatchlistSearch => {
    const r = raw as { page?: unknown; q?: unknown; cat?: unknown };
    const n = Number(r?.page);
    const page = Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
    const q = typeof r?.q === "string" ? r.q : "";
    const catRaw = typeof r?.cat === "string" ? r.cat : "All";
    const cat = (CATEGORY_FILTERS as readonly string[]).includes(catRaw)
      ? (catRaw as "All" | Category)
      : "All";
    return { page, q, cat };
  },
  head: () => ({
    meta: [
      { title: "Watchlist — The Get" },
      { name: "description", content: "The fashion houses you're watching for upcoming sales." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(watchlistQueryOptions);
    context.queryClient.ensureQueryData(setupQueryOptions);
    context.queryClient.ensureQueryData(housesQueryOptions);
  },
  component: WatchlistPage,
});

function WatchlistPage() {
  const items = useWatchlist();
  const { data: dashboard } = useSuspenseQuery(housesQueryOptions);
  const houseDTOs = dashboard.houses;
  const needsMarket = dashboard.needsMarket;
  const brandsBySlug = useMemo(() => {
    const m = new Map<string, Brand>();
    for (const h of houseDTOs) m.set(h.id, toBrand(h));
    return m;
  }, [houseDTOs]);

  const { removeMany } = useWatchlistMutations();
  const { setup } = useSetup();
  const { save: saveSetupMutation } = useSetupMutation();
  const { page, q, cat } = Route.useSearch();
  const navigate = Route.useNavigate();
  const gridTopRef = useRef<HTMLDivElement>(null);

  const resetPage = () => {
    navigate({ search: (prev: WatchlistSearch) => ({ ...prev, page: 1 }), replace: true });
  };
  const setQuery = (value: string) => {
    navigate({
      search: (prev: WatchlistSearch) => ({ ...prev, q: value, page: 1 }),
      replace: true,
    });
  };
  const setCategory = (value: "All" | Category) => {
    navigate({
      search: (prev: WatchlistSearch) => ({ ...prev, cat: value, page: 1 }),
      replace: true,
    });
  };
  const goToPage = (next: number) => {
    navigate({ search: (prev: WatchlistSearch) => ({ ...prev, page: next }) });
    requestAnimationFrame(() => {
      gridTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const clearSearchAndCategory = () => {
    navigate({
      search: (prev: WatchlistSearch) => ({ ...prev, q: "", cat: "All", page: 1 }),
      replace: true,
    });
  };
  const [departments, setDepartments] = useState<Set<Department>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const [sortBy, setSortBy] = useState<"signal" | "confidence" | "window">(() => {
    if (typeof window === "undefined") return "signal";
    const saved = window.localStorage.getItem("theget.watchlist.sort");
    return saved === "confidence" || saved === "window" ? saved : "signal";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("theget.watchlist.sort", sortBy);
  }, [sortBy]);

  // Subtle "Updating list…" flash when departments/sort change.
  const firstRunRef = useRef(true);
  const restoringRef = useRef(false);
  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    if (restoringRef.current) {
      restoringRef.current = false;
      return;
    }
    setIsUpdating(true);
    const updateTimer = window.setTimeout(() => setIsUpdating(false), BULK_TOGGLE_DEBOUNCE_MS);
    return () => window.clearTimeout(updateTimer);
  }, [departments, sortBy]);

  // Mirror department filter state from the backend-backed setup record.
  useEffect(() => {
    const next = new Set((setup?.departments ?? []) as Department[]);
    setDepartments((prev) => {
      if (prev.size === next.size && [...prev].every((d) => next.has(d))) {
        return prev;
      }
      restoringRef.current = true;
      return next;
    });
  }, [setup]);

  const { visible, hiddenCount, orphans, filteredOutByQuery } = useMemo(() => {
    const withMaybeBrand = items.map((it) => ({
      it,
      brand: brandsBySlug.get(it.brandId) ?? null,
    }));
    const known = withMaybeBrand.filter(
      (x): x is { it: (typeof items)[number]; brand: Brand } => !!x.brand,
    );
    const orphanItems = withMaybeBrand.filter((x) => !x.brand).map((x) => x.it);
    const byDept =
      departments.size === 0
        ? known
        : known.filter((x) => departments.has(brandDepartment(x.brand)));
    const qLower = q.trim().toLowerCase();
    const filtered = byDept.filter((x) => {
      const matchCat = cat === "All" || (x.brand.categories ?? []).includes(cat);
      const matchQ =
        !qLower ||
        x.brand.name.toLowerCase().includes(qLower) ||
        x.brand.tagline.toLowerCase().includes(qLower);
      return matchCat && matchQ;
    });
    const rank: Record<string, number> = { soon: 0, buy: 1, hold: 2, low: 3 };
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "confidence") {
        return b.brand.confidence - a.brand.confidence;
      }
      if (sortBy === "window") {
        return a.brand.windowDays - b.brand.windowDays;
      }
      const r = (rank[a.brand.signal] ?? 99) - (rank[b.brand.signal] ?? 99);
      if (r !== 0) return r;
      const c = b.brand.confidence - a.brand.confidence;
      if (c !== 0) return c;
      return a.brand.windowDays - b.brand.windowDays;
    });
    return {
      visible: sorted.map((x) => x.it),
      hiddenCount: known.length - byDept.length,
      orphans: orphanItems,
      filteredOutByQuery: byDept.length - filtered.length,
    };
  }, [items, brandsBySlug, departments, sortBy, q, cat]);

  const deptLabel = [...departments].join(", ");

  const hiddenDeptLabel = useMemo(() => {
    if (departments.size === 0) return "";
    const counts = new Map<Department, number>();
    for (const it of items) {
      const brand = brandsBySlug.get(it.brandId);
      if (!brand) continue;
      const d = brandDepartment(brand);
      if (departments.has(d)) continue;
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    return [...counts.entries()].map(([d, n]) => `${n} ${d}`).join(", ");
  }, [items, brandsBySlug, departments]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pagedVisible = visible.slice(startIdx, startIdx + PAGE_SIZE);
  const rangeStart = visible.length === 0 ? 0 : startIdx + 1;
  const rangeEnd = startIdx + pagedVisible.length;
  const pageItems = buildPageItems(safePage, totalPages);

  // Clamp out-of-range ?page=N deep links.
  useEffect(() => {
    if (page !== safePage) {
      navigate({
        search: (prev: WatchlistSearch) => ({ ...prev, page: safePage }),
        replace: true,
      });
    }
  }, [page, safePage, navigate]);

  // Reset to page 1 when filters that affect the visible list shrink it.
  // (Sort changes don't shrink, but the page may now feel off; reset for clarity.)
  useEffect(() => {
    if (page !== 1 && (safePage - 1) * PAGE_SIZE >= visible.length) {
      navigate({
        search: (prev: WatchlistSearch) => ({ ...prev, page: 1 }),
        replace: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departments, sortBy]);

  const visibleIds = useMemo(() => pagedVisible.map((v) => v.brandId), [pagedVisible]);
  const selectedVisibleCount = useMemo(
    () => visibleIds.filter((id) => selected.has(id)).length,
    [visibleIds, selected],
  );
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

  const hiddenSelectedCount = useMemo(() => {
    if (selected.size === 0) return 0;
    const visibleSet = new Set(visibleIds);
    let n = 0;
    selected.forEach((id) => {
      if (!visibleSet.has(id)) n += 1;
    });
    return n;
  }, [selected, visibleIds]);

  // Drop stale selections if items disappear (filter change, removal, etc.)
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set<string>();
      const ids = new Set(items.map((i) => i.brandId));
      prev.forEach((id) => ids.has(id) && next.add(id));
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  const toggleSelect = (brandId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(brandId)) next.delete(brandId);
      else next.add(brandId);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const clearDepartmentFilters = () => {
    setDepartments(new Set());
    saveSetupMutation({ departments: [] });
  };

  const saveTimerRef = useRef<number | null>(null);
  const removeDepartment = (d: Department) => {
    setDepartments((prev) => {
      if (!prev.has(d)) return prev;
      const next = new Set(prev);
      next.delete(d);
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = window.setTimeout(() => {
        saveSetupMutation({ departments: [...next] });
        saveTimerRef.current = null;
      }, 250);
      return next;
    });
  };

  const removeSelected = () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    removeMany(ids);
    exitSelectMode();
  };

  return (
    <PageLayout>
      {needsMarket && (
        <section className="mt-10 border border-foreground/20 bg-muted/40 p-5 md:p-6">
          <p className="eyebrow">Set your market</p>
          <p className="mt-2 max-w-xl text-sm text-foreground">
            Sale windows differ by country. Choose your market in your profile to see the right read.
          </p>
          <Link
            to="/profile"
            className="mt-4 inline-flex h-10 items-center border border-foreground px-4 text-[11px] uppercase tracking-[0.18em] hover:bg-foreground hover:text-background"
          >
            Set your market
          </Link>
        </section>
      )}
      <section className="pt-16 md:pt-24">

        <p className="eyebrow">Your watchlist</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">
          The houses you're watching.
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          We'll surface the read when a sale window opens for any of them.
        </p>
      </section>

      {departments.size > 0 && (
        <div className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>Filtered by</span>
          <ul className="flex flex-wrap items-center gap-2">
            {[...departments].map((d) => (
              <li key={d}>
                <span className="inline-flex items-center gap-1.5 border border-foreground bg-foreground/5 px-2.5 py-1 text-foreground">
                  {d}
                  <button
                    onClick={() => removeDepartment(d)}
                    aria-label={`Remove ${d} filter`}
                    className="leading-none text-foreground/60 hover:text-foreground"
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {hiddenCount > 0 && (
            <>
              <span aria-hidden className="text-muted-foreground/50">
                ·
              </span>
              <span>{hiddenCount} hidden</span>
            </>
          )}
          <span aria-hidden className="text-muted-foreground/50">
            ·
          </span>
          <button
            onClick={clearDepartmentFilters}
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Clear filters
          </button>
          <span aria-hidden className="text-muted-foreground/50">
            ·
          </span>
          <Link to="/setup" className="underline underline-offset-4 hover:text-foreground">
            Edit
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setCategory(f)}
                aria-pressed={cat === f}
                className={cn(
                  "border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors",
                  cat === f
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
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your watchlist…"
            className="w-full border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none md:w-64"
            aria-label="Search watchlist"
          />
        </div>
      )}

      <SectionRule />

      <div ref={gridTopRef} className="scroll-mt-24" />

      {items.length > 0 && (visible.length > 0 || selectMode) && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {selectMode ? (
              <>
                <button
                  onClick={toggleSelectAllVisible}
                  className="underline-offset-4 hover:text-foreground hover:underline"
                >
                  {allVisibleSelected ? "Clear all" : "Select all"}
                </button>
                <span>
                  {selected.size} selected
                  {hiddenSelectedCount > 0 && ` · ${hiddenSelectedCount} hidden by filter`}
                </span>
              </>
            ) : (
              <>
                <span>
                  {visible.length} {visible.length === 1 ? "house" : "houses"}
                </span>
                <span aria-hidden className="text-muted-foreground/50">
                  ·
                </span>
                <span>
                  Sorted by <span className="text-foreground">{sortLabel(sortBy)}</span>
                </span>
                {isUpdating && (
                  <span
                    aria-live="polite"
                    className="inline-flex items-center gap-1.5 text-foreground/70 transition-opacity"
                  >
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/60" />
                    Updating list…
                  </span>
                )}
                {sortBy !== "signal" && (
                  <button
                    onClick={() => setSortBy("signal")}
                    className="underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Reset sort
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectMode ? (
              <>
                <button
                  onClick={exitSelectMode}
                  className="border border-border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={removeSelected}
                  disabled={selected.size === 0}
                  className={cn(
                    "border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors",
                    selected.size === 0
                      ? "cursor-not-allowed border-border text-muted-foreground/60"
                      : "border-foreground bg-foreground text-background hover:opacity-90",
                  )}
                >
                  Remove{selected.size > 0 ? ` (${selected.size})` : ""}
                </button>
              </>
            ) : (
              <>
                <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  <span className="hidden sm:inline">Sort</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="border border-border bg-transparent px-2 py-1.5 text-[11px] uppercase tracking-[0.18em] text-foreground focus:border-foreground focus:outline-none"
                    aria-label="Sort watchlist"
                  >
                    <option value="signal">Signal strength</option>
                    <option value="confidence">Confidence</option>
                    <option value="window">Sale window</option>
                  </select>
                </label>
                <button
                  onClick={() => setSelectMode(true)}
                  className="border border-border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                >
                  Select
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="border border-dashed border-border px-8 py-20 text-center">
          <p className="font-serif text-2xl">Nothing on your watchlist yet. Add the houses you're watching.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Add the brands you'd buy on sale. We'll tell you when to buy and when to wait.
          </p>
          <Link
            to="/dashboard"
            className="mt-6 inline-block border border-foreground px-5 py-3 text-[11px] uppercase tracking-[0.18em] hover:bg-foreground hover:text-background"
          >
            Browse brands
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <div className="relative overflow-hidden border border-dashed border-border bg-card/40 px-8 py-20 text-center">
          <p className="eyebrow text-muted-foreground">Filtered out</p>
          <p className="mt-4 font-serif text-3xl leading-tight">No brands in {deptLabel}.</p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            {hiddenCount} {hiddenCount === 1 ? "brand is" : "brands are"} waiting in other
            departments
            {hiddenDeptLabel ? ` — ${hiddenDeptLabel}` : ""}.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={clearDepartmentFilters}
              className="inline-flex items-center border border-foreground bg-foreground px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-background transition-opacity hover:opacity-90"
            >
              Clear filters
            </button>
            <Link
              to="/setup"
              className="inline-flex items-center border border-border px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              Adjust in setup
            </Link>
          </div>
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {visible.map((it) => (
            <WatchlistCard
              key={it.brandId}
              item={it}
              brand={brandsBySlug.get(it.brandId) ?? null}
              selectable={selectMode}
              selected={selected.has(it.brandId)}
              onToggleSelect={toggleSelect}
            />
          ))}
          {orphans.map((it) => (
            <WatchlistCard key={it.brandId} item={it} brand={null} />
          ))}
        </section>
      )}
    </PageLayout>
  );
}

function sortLabel(sortBy: "signal" | "confidence" | "window") {
  switch (sortBy) {
    case "confidence":
      return "Confidence";
    case "window":
      return "Sale window";
    default:
      return "Signal strength";
  }
}
