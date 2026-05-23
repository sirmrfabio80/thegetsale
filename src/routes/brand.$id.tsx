import { createFileRoute, Link, notFound, isRedirect, isNotFound } from "@tanstack/react-router";

function isAuthShapedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /Unauthorized|JWT|issued at future|AuthSession|Invalid token|Invalid Refresh Token/i.test(
    msg,
  );
}
import { PageLayout, SectionRule } from "@/components/PageLayout";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { RecommendationCard } from "@/components/RecommendationCard";
import { SignalEditorial } from "@/components/brand/SignalEditorial";
import { SaleTimeline, WhySignalPanel } from "@/components/SaleTimeline";
import type { Brand, Category } from "@/data/types";
import { ArrowLeft, Bookmark, Loader2, Lock } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { brandDepartment } from "@/data/categoryMap";
import {
  getHouseDetail,
  getPublicHouseDetail,
  type HouseDetailDTO,
  type PublicHouseDTO,
} from "@/lib/brands.functions";
import { watchlistQueryOptions } from "@/data/store";

function detailToBrand(h: HouseDetailDTO): Brand {
  return {
    id: h.id,
    name: h.name,
    category: (h.category as Category) || "Womens",
    tagline: h.tagline,
    signal: h.signal,
    headline: h.headline,
    confidence: h.confidenceScore,
    windowDays: h.windowDays ?? 999,
    lastSaleDays: h.lastSaleDays ?? 0,
    expectedDepth: h.expectedDepth,
    cadence: h.cadence ?? "",
    factors: h.factors,
    history: h.history,
    websiteUrl: h.websiteUrl,
  };
}

export const Route = createFileRoute("/brand/$id")({
  loader: async ({ params, context }) => {
    const authed = context.auth?.status === "authenticated";
    if (authed) {
      void context.queryClient.ensureQueryData(watchlistQueryOptions).catch(() => {});
      try {
        const detail = await getHouseDetail({ data: { slug: params.id } });
        if (!detail) throw notFound();
        return { kind: "auth" as const, brand: detailToBrand(detail) };
      } catch (err) {
        if (isRedirect(err) || isNotFound(err)) throw err;
        if (!isAuthShapedError(err)) throw err;
        // fall through to public view on auth failure
      }
    }
    const pub = await getPublicHouseDetail({ data: { slug: params.id } });
    if (!pub) throw notFound();
    return { kind: "public" as const, house: pub };
  },
  head: ({ loaderData }) => {
    const name =
      loaderData?.kind === "auth"
        ? loaderData.brand.name
        : loaderData?.kind === "public"
          ? loaderData.house.name
          : "Brand";
    const desc =
      loaderData?.kind === "auth"
        ? loaderData.brand.headline
        : loaderData?.kind === "public"
          ? loaderData.house.tagline
          : "";
    return {
      meta: [{ title: `${name} — The Get` }, { name: "description", content: desc }],
    };
  },
  errorComponent: ({ error, reset }) => (
    <PageLayout>
      <div className="py-24 text-center">
        <p className="eyebrow text-muted-foreground">Couldn't load this brand</p>
        <p className="mt-3 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={reset} className="mt-4 underline underline-offset-4">
          Try again
        </button>
      </div>
    </PageLayout>
  ),
  notFoundComponent: () => (
    <PageLayout>
      <div className="py-24 text-center">
        <p className="eyebrow">Not found</p>
        <h1 className="mt-3 font-serif text-3xl">We don't track this brand yet.</h1>
        <Link to="/" className="mt-6 inline-block underline">
          Back to The Get
        </Link>
      </div>
    </PageLayout>
  ),
  component: BrandPage,
});

function BrandPage() {
  const data = Route.useLoaderData();
  if (data.kind === "auth") return <AuthenticatedBrand brand={data.brand} />;
  return <PublicBrandPreview house={data.house} />;
}

function AuthenticatedBrand({ brand }: { brand: Brand }) {
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
        <p className="eyebrow">
          {brand.category} <span className="text-muted-foreground/60">·</span>{" "}
          {brandDepartment(brand)}
        </p>
        <h1 className="mt-3 font-serif text-5xl leading-[1.02] md:text-7xl">{brand.name}</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">{brand.tagline}</p>
      </section>

      <div className="mt-10 space-y-6">
        <SignalEditorial brand={brand} />
        <RecommendationCard brand={brand} />
      </div>

      <SectionRule label="Why this signal" />
      <WhySignalPanel factors={brand.factors} />

      <SectionRule label={`See the pieces at ${brand.name}`} />
      <section className="border border-border bg-card px-6 py-8 md:px-10 md:py-10">
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          The Get doesn't store individual pieces — sales belong to the house and cover their full
          range. When the window opens, head to {brand.name}
          directly to browse what's on.
        </p>
        <div className="mt-6">
          {brand.websiteUrl ? (
            <a
              href={brand.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 border border-foreground bg-foreground px-5 text-[11px] uppercase tracking-[0.18em] text-background transition-opacity hover:opacity-90"
            >
              Open {brand.name}
            </a>
          ) : (
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Brand link coming soon
            </p>
          )}
        </div>
      </section>

      <SectionRule label="Sale archive" />
      <SaleTimeline events={brand.history} />

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8">
        <p className="max-w-md text-xs text-muted-foreground">
          Reads are illustrative for this prototype. No real prediction model is connected.
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

function publicDepartment(category: string): "Womenswear" | "Menswear" | "Unisex" {
  if (category === "Womens") return "Womenswear";
  if (category === "Mens") return "Menswear";
  return "Unisex";
}

function PublicBrandPreview({ house }: { house: PublicHouseDTO }) {
  const brand = house;
  const signupSearch = { redirect: `/brand/${brand.id}` };
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const promptSignIn = () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    navigate({ to: "/login", search: signupSearch }).catch(() => {
      setIsSigningIn(false);
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
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={promptSignIn}
                disabled={isSigningIn}
                aria-busy={isSigningIn}
                className="inline-flex h-12 w-full items-center justify-center gap-2 border border-foreground bg-foreground px-6 text-[11px] uppercase tracking-[0.18em] text-background transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70 sm:w-auto sm:justify-start"
              >
                {isSigningIn ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    Taking you to sign in…
                  </>
                ) : (
                  <>
                    <Bookmark className="h-3.5 w-3.5" aria-hidden />
                    Sign in to add to watchlist
                  </>
                )}
              </button>
              <p className="text-center text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:text-left">
                Free while in preview
              </p>
            </div>
          </div>
          <aside className="md:col-span-4 md:border-l md:border-border md:pl-8">
            <dl className="space-y-5 text-[13px] leading-relaxed">
              <div>
                <dt className="eyebrow text-muted-foreground">House</dt>
                <dd className="mt-1 text-foreground">{brand.category}</dd>
              </div>
              <div>
                <dt className="eyebrow text-muted-foreground">Department</dt>
                <dd className="mt-1 text-foreground">{publicDepartment(brand.category)}</dd>
              </div>
              <div>
                <dt className="eyebrow text-muted-foreground">Cadence</dt>
                <dd className="mt-1 text-foreground">{brand.cadence ?? "—"}</dd>
              </div>
              <div>
                <dt className="eyebrow text-muted-foreground">Last markdown</dt>
                <dd className="mt-1 text-foreground">
                  {brand.lastSaleDays != null ? `${brand.lastSaleDays} days ago` : "—"}
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
              We're tracking {brand.name}. The next move is taking shape — and members will see it
              before the rest of the room.
            </p>
            <p className="mt-6 max-w-prose text-sm leading-relaxed text-muted-foreground">
              Sign in to read the full signal: when to buy, when to wait, the factors behind the
              call, and the complete sale archive for this house.
            </p>
          </div>

          {/* Redacted stat tiles */}
          <div className="md:col-span-5">
            <ul className="grid grid-cols-3 gap-px bg-border">
              {[{ label: "Signal" }, { label: "Window" }, { label: "Depth" }].map((tile) => (
                <li
                  key={tile.label}
                  className="flex flex-col items-start justify-between bg-background p-5"
                >
                  <span className="eyebrow text-muted-foreground">{tile.label}</span>
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
                A closer look at the dossier we keep on {brand.name} — and every house you choose to
                follow.
              </p>
            </div>

            <div className="md:col-span-8">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="signal" className="border-border">
                  <AccordionTrigger className="text-left font-serif text-lg hover:no-underline md:text-xl">
                    The signal — buy, hold, or wait
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    A clear recommendation with a confidence score, the expected discount window,
                    and how deep the markdown is likely to go. No guesswork, no scrolling through
                    twenty tabs.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="why" className="border-border">
                  <AccordionTrigger className="text-left font-serif text-lg hover:no-underline md:text-xl">
                    Why we're calling it
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    The factors behind the read — cadence, inventory movement, seasonal patterns,
                    and house-specific tells — written in plain language by the editors who follow{" "}
                    {brand.name}.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="archive" className="border-border">
                  <AccordionTrigger className="text-left font-serif text-lg hover:no-underline md:text-xl">
                    The full sale archive
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    Every markdown {brand.name} has run, with dates, depths, and the name of each
                    edit. Useful for spotting the rhythm before the next one lands.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="watchlist" className="border-border">
                  <AccordionTrigger className="text-left font-serif text-lg hover:no-underline md:text-xl">
                    A private watchlist
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    Follow {brand.name} alongside the other houses you care about. We'll keep an eye
                    on the tempo so you don't have to refresh anything.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="pieces" className="border-b-0 border-border">
                  <AccordionTrigger className="text-left font-serif text-lg hover:no-underline md:text-xl">
                    The pieces worth watching
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    A shortlist of items from {brand.name} we think are likely to move — with
                    prices, stock notes, and a quiet read on which ones tend to disappear first.
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
              Join The Get to follow {brand.name} and the other houses you care about. Free while
              we're in preview.
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
