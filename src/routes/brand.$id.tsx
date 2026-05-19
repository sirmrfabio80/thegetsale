import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageLayout, SectionRule } from "@/components/PageLayout";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { getBrand } from "@/data/brands";
import { RecommendationCard } from "@/components/RecommendationCard";
import { SaleTimeline, WhySignalPanel } from "@/components/SaleTimeline";
import type { Brand } from "@/data/types";

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
        <Link to="/" className="mt-6 inline-block underline">Back to The Get</Link>
      </div>
    </PageLayout>
  ),
  component: BrandPage,
});

function BrandPage() {
  const { brand } = Route.useLoaderData();
  const { auth } = Route.useRouteContext();

  if (auth.status === "authenticated") {
    return <AuthenticatedBrand brand={brand} />;
  }

  return <PublicBrandPreview brand={brand} />;
}

function AuthenticatedBrand({ brand }: { brand: Brand }) {
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

function PublicBrandPreview({ brand }: { brand: Brand }) {
  const signupSearch = { redirect: `/brand/${brand.id}` };

  return (
    <MarketingLayout>
      <div className="mx-auto w-full max-w-5xl px-5 md:px-10">
        <div className="pt-12 md:pt-16">
          <Link to="/" className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
            ← The Get
          </Link>
        </div>

        <section className="pt-8 md:pt-10">
          <p className="eyebrow">{brand.category}</p>
          <h1 className="mt-3 font-serif text-5xl leading-[1.02] md:text-7xl">{brand.name}</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">{brand.tagline}</p>
        </section>

        <section className="relative mt-12">
          <div aria-hidden className="pointer-events-none select-none blur-sm">
            <RecommendationCard brand={brand} />
            <SectionRule label="Why this signal" />
            <WhySignalPanel factors={brand.factors} />
          </div>

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />

          <div className="relative mt-10 border border-foreground bg-background p-8 md:p-10">
            <p className="eyebrow">Members only</p>
            <h2 className="mt-3 font-serif text-3xl leading-tight md:text-4xl">
              Sign in to read this signal.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              See the timing call for {brand.name}, the factors behind it, and the full sale archive. Free while we're in
              preview.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/signup"
                search={signupSearch}
                className="inline-flex h-11 items-center border border-foreground bg-foreground px-5 text-[11px] uppercase tracking-[0.18em] text-background transition-opacity hover:opacity-90"
              >
                Create your signal
              </Link>
              <Link
                to="/login"
                search={signupSearch}
                className="inline-flex h-11 items-center border border-border px-5 text-[11px] uppercase tracking-[0.18em] text-foreground transition-colors hover:border-foreground"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
