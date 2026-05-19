import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout, SectionRule } from "@/components/PageLayout";
import { brands } from "@/data/brands";
import { BrandCard } from "@/components/BrandCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Get — Know when to buy. Know when to wait." },
      { name: "description", content: "A calmer way to shop. Private signals for clothing and accessories worth waiting on." },
    ],
  }),
  component: Index,
});

function Index() {
  const featured = brands.slice(0, 3);
  return (
    <PageLayout>
      <section className="pt-20 md:pt-28">
        <p className="eyebrow">Private shopping intelligence</p>
        <h1 className="mt-5 font-serif text-5xl leading-[1.02] tracking-tight md:text-7xl">
          Know when to buy.
          <br />
          <span className="italic text-muted-foreground">Know when to wait.</span>
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
          The Get reads the rhythm of the brands you care about — cadence, inventory, season — and tells you, quietly, whether to buy now or hold for a markdown.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4 text-[12px]">
          <Link
            to="/dashboard"
            className="border border-foreground bg-foreground px-5 py-3 uppercase tracking-[0.18em] text-background transition-opacity hover:opacity-90"
          >
            See today's signals
          </Link>
          <Link
            to="/watchlist"
            className="border border-border px-5 py-3 uppercase tracking-[0.18em] text-foreground transition-colors hover:border-foreground"
          >
            Open watchlist
          </Link>
        </div>
      </section>

      <SectionRule label="How it reads the market" />

      <section className="grid grid-cols-1 gap-10 md:grid-cols-3">
        {[
          { n: "01", t: "Cadence", d: "How often a house actually marks down, not what they say." },
          { n: "02", t: "Inventory", d: "Depth, size runs, and the quiet pieces that signal a sale." },
          { n: "03", t: "Market", d: "What peer brands and stockists are previewing this week." },
        ].map((s) => (
          <div key={s.n}>
            <p className="font-serif text-3xl text-muted-foreground">{s.n}</p>
            <h3 className="mt-4 font-serif text-2xl">{s.t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
          </div>
        ))}
      </section>

      <SectionRule label="This week, in brief" />

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {featured.map((b) => (
          <BrandCard key={b.id} brand={b} />
        ))}
      </section>

      <SectionRule label="An editorial note" />

      <section className="mx-auto max-w-2xl py-6 text-center">
        <p className="font-serif text-2xl italic leading-relaxed text-foreground md:text-3xl">
          “Most of the games retailers play with you have a tempo. Once you can hear it, the shopping gets quieter.”
        </p>
        <p className="eyebrow mt-6">The Get — Editor's note</p>
      </section>
    </PageLayout>
  );
}
