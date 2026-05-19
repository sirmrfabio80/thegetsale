import { Link } from "@tanstack/react-router";

export function FinalCTA() {
  return (
    <section className="mx-auto w-full max-w-6xl border-t border-border px-5 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <p className="eyebrow">Begin quietly</p>
        <h2 className="mt-6 font-serif text-4xl leading-[1.05] md:text-6xl">
          Start with the houses
          <br />
          <span className="italic text-muted-foreground">you already watch.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
          A few minutes of setup. A calmer relationship with what you buy.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3">
          <Link
            to="/signup"
            className="inline-flex h-12 items-center justify-center border border-foreground bg-foreground px-8 text-[12px] uppercase tracking-[0.18em] text-background transition-opacity hover:opacity-90"
          >
            Create your signal
          </Link>
          <Link
            to="/login"
            className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Already have an account · Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}
