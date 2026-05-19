import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageLayout, SectionRule } from "@/components/PageLayout";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { getBrand } from "@/data/brands";
import { RecommendationCard } from "@/components/RecommendationCard";
import { SaleTimeline, WhySignalPanel } from "@/components/SaleTimeline";
import type { Brand } from "@/data/types";
import { ArrowLeft, Bookmark, Lock } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
  const watchedPieces = getWatchedPieces(brand);

  return (
    <PageLayout>
      <div className="pt-12 md:pt-16">
        <Link
          to="/dashboard"
          className="inline-flex h-9 items-center gap-2 border border-border px-4 text-[11px] uppercase tracking-[0.18em] text-foreground transition-colors hover:border-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to dashboard
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

      <SectionRule label="Pieces you're watching" />
      <ul className="grid grid-cols-1 gap-px bg-border md:grid-cols-2">
        {watchedPieces.map((piece) => (
          <li
            key={piece.name}
            className="flex items-start justify-between gap-6 bg-background p-5"
          >
            <div className="min-w-0">
              <p className="truncate font-serif text-lg leading-tight text-foreground">
                {piece.name}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {piece.detail}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-serif text-lg leading-tight text-foreground">
                {piece.price}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {piece.status}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <SectionRule label="Sale archive" />
      <SaleTimeline events={brand.history} />

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8">
        <p className="max-w-md text-xs text-muted-foreground">
          Signals are illustrative for this prototype. No real prediction model is connected.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex h-9 shrink-0 items-center gap-2 border border-border px-4 text-[11px] uppercase tracking-[0.18em] text-foreground transition-colors hover:border-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to dashboard
        </Link>
      </div>
    </PageLayout>
  );
}

type WatchedPiece = {
  name: string;
  detail: string;
  price: string;
  status: string;
};

function getWatchedPieces(brand: Brand): WatchedPiece[] {
  // Deterministic mock pieces seeded from the brand name so each house
  // shows a consistent shortlist without a backend.
  const seed = brand.name.charCodeAt(0) + brand.name.length;
  const pool: WatchedPiece[] = [
    { name: "Soft tailored blazer", detail: "Wool · Black", price: "£1,290", status: "In stock" },
    { name: "Cashmere crewneck", detail: "Knitwear · Camel", price: "£640", status: "Low stock" },
    { name: "Pleated wide trouser", detail: "Wool · Charcoal", price: "£780", status: "In stock" },
    { name: "Leather derby", detail: "Footwear · Brown", price: "£890", status: "2 sizes left" },
    { name: "Silk square scarf", detail: "Accessory · Ivory", price: "£320", status: "In stock" },
    { name: "Shearling overshirt", detail: "Outerwear · Stone", price: "£2,150", status: "Backorder" },
    { name: "Cotton poplin shirt", detail: "Shirting · White", price: "£390", status: "In stock" },
    { name: "Belted trench", detail: "Outerwear · Sand", price: "£1,890", status: "1 left" },
  ];
  const start = seed % pool.length;
  return [
    pool[start],
    pool[(start + 3) % pool.length],
    pool[(start + 5) % pool.length],
    pool[(start + 6) % pool.length],
  ];
}

function PublicBrandPreview({ brand }: { brand: Brand }) {
  const signupSearch = { redirect: `/brand/${brand.id}` };
  const navigate = useNavigate();

  const promptSignIn = () => {
    toast(`Sign in to watch ${brand.name}`, {
      description: "Create a free account to follow houses and see the full signal.",
      action: {
        label: "Sign in",
        onClick: () => navigate({ to: "/login", search: signupSearch }),
      },
    });
  };


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

        {/* What you'll see after sign-in */}
        <section className="mt-20 border-t border-border pt-16">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-12">
            <div className="md:col-span-4">
              <p className="eyebrow">Members preview</p>
              <h2 className="mt-4 font-serif text-3xl leading-snug md:text-4xl">
                What you'll see after sign-in.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                A closer look at the dossier we keep on {brand.name} — and
                every house you choose to follow.
              </p>
            </div>

            <div className="md:col-span-8">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="signal" className="border-border">
                  <AccordionTrigger className="text-left font-serif text-lg hover:no-underline md:text-xl">
                    The signal — buy, hold, or wait
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    A clear recommendation with a confidence score, the
                    expected discount window, and how deep the markdown is
                    likely to go. No guesswork, no scrolling through twenty
                    tabs.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="why" className="border-border">
                  <AccordionTrigger className="text-left font-serif text-lg hover:no-underline md:text-xl">
                    Why we're calling it
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    The factors behind the read — cadence, inventory
                    movement, seasonal patterns, and house-specific tells —
                    written in plain language by the editors who follow
                    {" "}{brand.name}.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="archive" className="border-border">
                  <AccordionTrigger className="text-left font-serif text-lg hover:no-underline md:text-xl">
                    The full sale archive
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    Every markdown {brand.name} has run, with dates, depths,
                    and the name of each edit. Useful for spotting the rhythm
                    before the next one lands.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="watchlist" className="border-border">
                  <AccordionTrigger className="text-left font-serif text-lg hover:no-underline md:text-xl">
                    A private watchlist
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    Follow {brand.name} alongside the other houses you care
                    about. We'll keep an eye on the tempo so you don't have
                    to refresh anything.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="pieces" className="border-b-0 border-border">
                  <AccordionTrigger className="text-left font-serif text-lg hover:no-underline md:text-xl">
                    The pieces worth watching
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    A shortlist of items from {brand.name} we think are
                    likely to move — with prices, stock notes, and a quiet
                    read on which ones tend to disappear first.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
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
