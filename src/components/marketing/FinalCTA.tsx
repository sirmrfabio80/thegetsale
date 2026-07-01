import { AuthCTA } from "./AuthCTA";
import { usePrivateBeta } from "@/hooks/use-private-beta";

export function FinalCTA() {
  const { enabled: privateBeta } = usePrivateBeta();
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
          {privateBeta
            ? "Private beta — new accounts are paused. Sign in if you're already with us."
            : "A few minutes of setup. A calmer relationship with what you buy."}
        </p>

        <div className="mt-10 flex flex-col items-center gap-3">
          <AuthCTA variant="primary" size="default" mode="auto" className="px-8" />
          {!privateBeta && (
            <AuthCTA
              variant="text"
              mode="signin"
              className="text-[12px] uppercase tracking-[0.18em]"
            >
              Already have an account · Sign in
            </AuthCTA>
          )}
        </div>
      </div>
    </section>
  );
}
