import { Link } from "@tanstack/react-router";
import { usePrivateBeta } from "@/hooks/use-private-beta";
import { heroSummer } from "@/lib/marketing-media";
import { FullBleedSection } from "@/components/FullBleedSection";
import { MediaBackdrop } from "@/components/MediaBackdrop";

export function Hero() {
  const { enabled: privateBeta } = usePrivateBeta();

  const primaryTo = privateBeta ? "/login" : "/signup";
  const primaryLabel = privateBeta ? "Sign in" : "Create your signal";

  return (
    <FullBleedSection className="isolate flex min-h-[72svh] flex-col justify-end bg-foreground md:min-h-[82vh]">
      <MediaBackdrop poster={heroSummer.poster} webm={heroSummer.webm} mp4={heroSummer.mp4} />


      {/* Bottom-up dark scrim for text legibility */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent"
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pt-40 pb-16 text-background md:px-10 md:pt-56 md:pb-24">
        <p className="eyebrow text-background/80">Private shopping intelligence</p>
        <h1 className="mt-6 font-serif text-[2.75rem] leading-[1.02] tracking-tight md:text-[5.5rem]">
          Know when to buy.
          <br />
          <span className="italic text-background/70">Know when to wait.</span>
        </h1>
        <p className="mt-8 max-w-xl text-base leading-relaxed text-background/80 md:text-lg">
          Follow your favourite fashion houses and brands. We'll tell you when a sale is likely,
          how deep it tends to go, and whether to buy now or wait.
        </p>

        <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Link
            to={primaryTo}
            className="inline-flex h-12 items-center justify-center bg-background px-6 text-[12px] uppercase tracking-[0.18em] text-foreground transition-opacity hover:opacity-90"
          >
            {primaryLabel}
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex h-12 items-center justify-center border border-background/40 px-6 text-[12px] uppercase tracking-[0.18em] text-background transition-colors hover:border-background"
          >
            See how it works
          </a>
        </div>
      </div>
    </FullBleedSection>
  );
}
