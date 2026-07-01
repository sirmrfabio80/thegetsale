import { Link } from "@tanstack/react-router";
import { AuthCTA } from "./AuthCTA";

export function Hero() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pt-16 pb-20 md:px-10 md:pt-28 md:pb-32">
      <p className="eyebrow">Private shopping intelligence</p>
      <h1 className="mt-6 font-serif text-[2.75rem] leading-[1.02] tracking-tight md:text-[5.5rem]">
        Know when to buy.
        <br />
        <span className="italic text-muted-foreground">Know when to wait.</span>
      </h1>
      <p className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
        Follow your favourite fashion houses and brands. We'll tell you when a sale is likely, how
        deep it tends to go, and whether to buy now or wait.
      </p>

      <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
        <AuthCTA variant="primary" size="default" mode="auto" />
        <a
          href="#how-it-works"
          className="inline-flex h-12 items-center justify-center border border-border px-6 text-[12px] uppercase tracking-[0.18em] text-foreground transition-colors hover:border-foreground"
        >
          See how it works
        </a>
      </div>
    </section>
  );
}
