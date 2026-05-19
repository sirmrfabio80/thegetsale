import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout, SectionRule } from "@/components/PageLayout";
import { useWatchlist } from "@/data/store";
import { WatchlistCard } from "@/components/WatchlistCard";

export const Route = createFileRoute("/watchlist")({
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
      ) : (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {items.map((it) => (
            <WatchlistCard key={`${it.brandId}-${it.itemName}`} item={it} />
          ))}
        </section>
      )}
    </PageLayout>
  );
}
