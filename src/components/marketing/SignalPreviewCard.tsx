import { CardClampedText } from "@/components/CardBase";

type Signal = "Buy now" | "Wait" | "Hold";

export type PreviewCardProps = {
  category: string;
  house: string;
  headline: string;
  signal: Signal;
};

export function SignalPreviewCard({ category, house, headline, signal }: PreviewCardProps) {
  return (
    <article className="relative flex h-full flex-col border border-border bg-background/60 p-6 transition-colors hover:border-foreground/40">
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">{category}</p>
        <span className="border border-border px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {signal}
        </span>
      </div>

      <CardClampedText as="h3" lines={2} lineHeightEm={1.15} className="mt-5 font-serif text-2xl leading-tight">
        {house}
      </CardClampedText>
      <CardClampedText lines={2} lineHeightEm={1.625} className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {headline}
      </CardClampedText>

      <div className="mt-6 flex-1" />

      {/* Blurred lower half — teases data without revealing it */}
      <div
        aria-hidden
        className="mt-6 select-none space-y-3 [filter:blur(6px)] [mask-image:linear-gradient(to_bottom,black,transparent)]"
      >
        <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>Confidence</span>
          <span>—</span>
        </div>
        <div className="h-1.5 w-3/4 bg-foreground/40" />
        <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>Window</span>
          <span>—</span>
        </div>
        <div className="h-1.5 w-1/2 bg-foreground/30" />
        <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>Depth</span>
          <span>—</span>
        </div>
        <div className="h-1.5 w-2/3 bg-foreground/20" />
      </div>
    </article>
  );
}
