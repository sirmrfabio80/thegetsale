import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageLayout, SectionRule } from "@/components/PageLayout";
import { getBrand } from "@/data/brands";
import { RecommendationCard } from "@/components/RecommendationCard";
import { SaleTimeline, WhySignalPanel } from "@/components/SaleTimeline";

export const Route = createFileRoute("/brand/$id")({
  loader: ({ params }) => {
    const brand = getBrand(params.id);
    if (!brand) throw notFound();
    return { brand };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.brand.name ?? "Brand"} — The Get` },
      { name: "description", content: loaderData?.brand.headline ?? "" },
    ],
  }),
  errorComponent: ({ error, reset }) => (
    <PageLayout>
      <div className="py-24 text-center">
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <button onClick={reset} className="mt-4 underline">Try again</button>
      </div>
    </PageLayout>
  ),
  notFoundComponent: () => (
    <PageLayout>
      <div className="py-24 text-center">
        <p className="eyebrow">Not found</p>
        <h1 className="mt-3 font-serif text-3xl">This house isn't on our watch.</h1>
        <Link to="/dashboard" className="mt-6 inline-block underline">See all signals</Link>
      </div>
    </PageLayout>
  ),
  component: BrandPage,
});

function BrandPage() {
  const { brand } = Route.useLoaderData();
  return (
    <PageLayout>
      <div className="pt-12 md:pt-16">
        <Link to="/dashboard" className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
          ← All signals
        </Link>
      </div>

      <section className="pt-8 md:pt-10">
        <p className="eyebrow">{brand.category}</p>
        <h1 className="mt-3 font-serif text-5xl leading-[1.02] md:text-7xl">{brand.name}</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">{brand.tagline}</p>
      </section>

      <div className="mt-10">
        <RecommendationCard brand={brand} />
      </div>

      <SectionRule label="Why this signal" />
      <WhySignalPanel factors={brand.factors} />

      <SectionRule label="Sale archive" />
      <SaleTimeline events={brand.history} />

      <p className="mt-6 text-xs text-muted-foreground">
        Signals are illustrative for this prototype. No real prediction model is connected.
      </p>
    </PageLayout>
  );
}
