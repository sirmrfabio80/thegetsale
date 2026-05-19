import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageLayout, SectionRule } from "@/components/PageLayout";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { getBrand } from "@/data/brands";
import { RecommendationCard } from "@/components/RecommendationCard";
import { SaleTimeline, WhySignalPanel } from "@/components/SaleTimeline";
import type { Brand } from "@/data/types";
import { Lock } from "lucide-react";

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
      <article className="mx-auto w-full max-w-5xl px-5 md:px-10">
        {/* Editorial header */}
        <div className="pt-12 md:pt-16">
          <Link
            to="/"
            className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          >
            ← The Get
          </Link>
        </div>

        <header className="grid grid-cols-1 gap-10 pt-10 md:grid-cols-12 md:gap-12 md:pt-16">
          <div className="md:col-span-8">
            <p className="eyebrow">The Get · Dossier</p>
            <h1 className="mt-4 font-serif text-5xl leading-[1.02] tracking-tight md:text-7xl">
              {brand.name}
            </h1>
            <p className="mt-4 max-w-xl font-serif text-xl italic leading-snug text-foreground/80 md:text-2xl">
              {brand.tagline}
            </p>
          </div>
          <aside className="md:col-span-4 md:border-l md:border-border md:pl-8">
            <dl className="space-y-5 text-[13px] leading-relaxed">
              <div>
                <dt className="eyebrow text-muted-foreground">House</dt>
                <dd className="mt-1 text-foreground">{brand.category}</dd>
              </div>
              <div>
                <dt className="eyebrow text-muted-foreground">Cadence</dt>
                <dd className="mt-1 text-foreground">{brand.cadence}</dd>
              </div>
              <div>
                <dt className="eyebrow text-muted-foreground">Last markdown</dt>
                <dd className="mt-1 text-foreground">
                  {brand.lastSaleDays} days ago
                </dd>
              </div>
            </dl>
          </aside>
        </header>

        <div className="my-14 hairline" />

        {/* Editor's read — teaser */}
        <section className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-12">
          <div className="md:col-span-7">
            <p className="eyebrow">Editor's read</p>
            <p className="mt-4 font-serif text-2xl leading-snug text-foreground md:text-3xl">
              We're tracking {brand.name}. The next move is taking shape — and
              members will see it before the rest of the room.
            </p>
            <p className="mt-6 max-w-prose text-sm leading-relaxed text-muted-foreground">
              Sign in to read the full signal: when to buy, when to wait, the
              factors behind the call, and the complete sale archive for this
              house.
            </p>
          </div>

          {/* Redacted stat tiles */}
          <div className="md:col-span-5">
            <ul className="grid grid-cols-3 gap-px bg-border">
              {[
                { label: "Signal" },
                { label: "Window" },
                { label: "Depth" },
              ].map((tile) => (
                <li
                  key={tile.label}
                  className="flex flex-col items-start justify-between bg-background p-5"
                >
                  <span className="eyebrow text-muted-foreground">
                    {tile.label}
                  </span>
                  <span
                    aria-hidden
                    className="mt-6 font-serif text-3xl leading-none tracking-tight text-foreground/15 select-none"
                  >
                    ——
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <Lock className="h-3 w-3" aria-hidden /> Members only
            </p>
          </div>
        </section>

        {/* Sign-in invitation */}
        <section className="mt-20 border-t border-border pt-16 pb-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">An invitation</p>
            <p className="mt-5 font-serif text-3xl leading-snug text-foreground md:text-4xl">
              "The shopping gets quieter once you can hear the tempo."
            </p>
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              Join The Get to follow {brand.name} and the other houses you care
              about. Free while we're in preview.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/signup"
                search={signupSearch}
                className="inline-flex h-11 items-center border border-foreground bg-foreground px-6 text-[11px] uppercase tracking-[0.18em] text-background transition-opacity hover:opacity-90"
              >
                Create your signal
              </Link>
              <Link
                to="/login"
                search={signupSearch}
                className="inline-flex h-11 items-center border border-border px-6 text-[11px] uppercase tracking-[0.18em] text-foreground transition-colors hover:border-foreground"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </article>
    </MarketingLayout>
  );
}
