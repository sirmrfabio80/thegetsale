import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageLayout, SectionRule } from "@/components/PageLayout";
import { useWatchlist } from "@/data/store";
import { WatchlistCard } from "@/components/WatchlistCard";
import { getBrand } from "@/data/brands";
import { brandDepartment } from "@/data/categoryMap";
import { loadSetup, type Department } from "@/data/setupStorage";

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

  useEffect(() => {
    const s = loadSetup();
    if (s?.departments?.length) setDepartments(new Set(s.departments as Department[]));
  }, []);

  const { visible, hiddenCount } = useMemo(() => {
    if (departments.size === 0) return { visible: items, hiddenCount: 0 };
    const visible = items.filter((it) => {
      const brand = getBrand(it.brandId);
      return brand ? departments.has(brandDepartment(brand)) : false;
    });
    return { visible, hiddenCount: items.length - visible.length };
  }, [items, departments]);

  const deptLabel = [...departments].join(", ");

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

      {items.length === 0 ? (
        <div className="border border-dashed border-border px-8 py-20 text-center">
          <p className="font-serif text-2xl">Nothing on watch yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Start with today's signals — add a house you're considering.
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
          <p className="font-serif text-2xl">No saved brands match your departments.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {hiddenCount} {hiddenCount === 1 ? "brand is" : "brands are"} hidden by your current selection.
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
            <WatchlistCard key={it.brandId} item={it} />
          ))}
        </section>
      )}
    </PageLayout>
  );
}
