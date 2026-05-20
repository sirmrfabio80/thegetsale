import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageLayout, SectionRule } from "@/components/PageLayout";
import { useWatchlist, watchlistStore } from "@/data/store";
import { WatchlistCard } from "@/components/WatchlistCard";
import { getBrand } from "@/data/brands";
import { brandDepartment } from "@/data/categoryMap";
import { loadSetup, type Department } from "@/data/setupStorage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/watchlist")({
  head: () => ({
    meta: [
      { title: "Watchlist — The Get" },
      { name: "description", content: "The pieces you're waiting on, watched quietly." },
    ],
  }),
  component: WatchlistPage,
});

function WatchlistPage() {
  const items = useWatchlist();
  const [departments, setDepartments] = useState<Set<Department>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const sync = () => {
      const s = loadSetup();
      setDepartments(new Set((s?.departments ?? []) as Department[]));
    };
    sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === "theget.setup.v1") sync();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const { visible, hiddenCount } = useMemo(() => {
    const withBrand = items
      .map((it) => ({ it, brand: getBrand(it.brandId) }))
      .filter((x): x is { it: typeof items[number]; brand: NonNullable<ReturnType<typeof getBrand>> } => !!x.brand);
    const filtered =
      departments.size === 0
        ? withBrand
        : withBrand.filter((x) => departments.has(brandDepartment(x.brand)));
    const rank: Record<string, number> = { soon: 0, buy: 1, hold: 2, low: 3 };
    const sorted = [...filtered].sort((a, b) => {
      const r = (rank[a.brand.signal] ?? 99) - (rank[b.brand.signal] ?? 99);
      if (r !== 0) return r;
      const c = b.brand.confidence - a.brand.confidence;
      if (c !== 0) return c;
      return a.brand.windowDays - b.brand.windowDays;
    });
    return { visible: sorted.map((x) => x.it), hiddenCount: items.length - filtered.length };
  }, [items, departments]);

  const deptLabel = [...departments].join(", ");

  const hiddenDeptLabel = useMemo(() => {
    if (departments.size === 0) return "";
    const counts = new Map<Department, number>();
    for (const it of items) {
      const brand = getBrand(it.brandId);
      if (!brand) continue;
      const d = brandDepartment(brand);
      if (departments.has(d)) continue;
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    return [...counts.entries()].map(([d, n]) => `${n} ${d}`).join(", ");
  }, [items, departments]);


  const visibleIds = useMemo(() => visible.map((v) => v.brandId), [visible]);
  const selectedVisibleCount = useMemo(
    () => visibleIds.filter((id) => selected.has(id)).length,
    [visibleIds, selected],
  );
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

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

  const removeSelected = () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    watchlistStore.removeMany(ids);
    toast(`${ids.length} ${ids.length === 1 ? "brand" : "brands"} removed from watchlist`);
    exitSelectMode();
  };


  return (
    <PageLayout>
      <section className="pt-16 md:pt-24">
        <p className="eyebrow">Your watchlist</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">
          The pieces you're waiting on.
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          We'll let you know — gently — when the signal turns.
        </p>
      </section>

      {departments.size > 0 && (
        <p className="mt-10 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Filtered by department · {deptLabel}
          {hiddenCount > 0 && (
            <>
              {" "}· {hiddenCount} hidden ·{" "}
              <Link to="/setup" className="underline underline-offset-4 hover:text-foreground">
                Edit
              </Link>
            </>
          )}
        </p>
      )}

      <SectionRule />

      {items.length > 0 && visible.length > 0 && (
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
                </span>
              </>
            ) : (
              <span>
                {visible.length} {visible.length === 1 ? "brand" : "brands"}
              </span>
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
              <button
                onClick={() => setSelectMode(true)}
                className="border border-border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                Select
              </button>
            )}
          </div>
        </div>
      )}


      {items.length === 0 ? (
        <div className="border border-dashed border-border px-8 py-20 text-center">
          <p className="font-serif text-2xl">Nothing on watch yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Start with today's signals — add a house in Womenswear, Menswear or Unisex you're considering.
          </p>
          <Link
            to="/dashboard"
            className="mt-6 inline-block border border-foreground px-5 py-3 text-[11px] uppercase tracking-[0.18em] hover:bg-foreground hover:text-background"
          >
            Browse signals
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <div className="border border-dashed border-border px-8 py-20 text-center">
          <p className="font-serif text-2xl">No saved brands in {deptLabel}.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {hiddenCount} {hiddenCount === 1 ? "brand is" : "brands are"} on watch in other departments
            {hiddenDeptLabel ? ` — ${hiddenDeptLabel}` : ""}.
          </p>
          <Link
            to="/setup"
            className="mt-6 inline-block border border-foreground px-5 py-3 text-[11px] uppercase tracking-[0.18em] hover:bg-foreground hover:text-background"
          >
            Adjust departments
          </Link>
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {visible.map((it) => (
            <WatchlistCard
              key={it.brandId}
              item={it}
              selectable={selectMode}
              selected={selected.has(it.brandId)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </section>

      )}
    </PageLayout>
  );
}
