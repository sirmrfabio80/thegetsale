import { Link } from "@tanstack/react-router";
import { SignalPreviewCard } from "./SignalPreviewCard";
import { usePrivateBeta } from "@/hooks/use-private-beta";

const samples = [
  {
    category: "Ready-to-wear",
    house: "Maison Ardoise",
    headline: "Cadence suggests the spring tailoring softens within ten days.",
    signal: "Wait" as const,
  },
  {
    category: "Leather goods",
    house: "North Room",
    headline: "Depth thinning on the archive totes — quiet pre-markdown signal.",
    signal: "Buy now" as const,
  },
  {
    category: "Footwear",
    house: "Atelier Vence",
    headline: "Sizing holds steady; no movement expected before mid-season.",
    signal: "Hold" as const,
  },
];

export function PreviewSection() {
  const { enabled: privateBeta } = usePrivateBeta();
  return (
    <section className="mx-auto w-full max-w-6xl border-t border-border px-5 py-20 md:px-10 md:py-28">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">A look inside</p>
          <h2 className="mt-4 font-serif text-3xl leading-tight md:text-5xl">
            The dashboard, quietly.
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          A glimpse of how signals read — house by house, day by day.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
        {samples.map((s) => (
          <SignalPreviewCard key={s.house} {...s} />
        ))}
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        {privateBeta ? (
          <>
            Full signals unlock after sign-in.{" "}
            <Link to="/login" className="text-foreground underline underline-offset-4 hover:opacity-70">
              Sign in
            </Link>
            .
          </>
        ) : (
          <>
            Full signals unlock after sign-up.{" "}
            <Link to="/signup" className="text-foreground underline underline-offset-4 hover:opacity-70">
              Create your signal
            </Link>
            .
          </>
        )}
      </p>
    </section>
  );
}
