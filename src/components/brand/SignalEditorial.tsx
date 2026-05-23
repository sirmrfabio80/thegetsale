import type { Brand } from "@/data/types";
import { SignalBadge } from "@/components/SignalBadge";

const signalCopy: Record<Brand["signal"], { kicker: string; body: string }> = {
  buy: {
    kicker: "Move now",
    body: "The window is open. Depth and availability favour the buyer this week.",
  },
  soon: {
    kicker: "Hold position",
    body: "A markdown is forming. Watch the next two weeks before committing.",
  },
  hold: {
    kicker: "Stay patient",
    body: "Cadence suggests the house is between edits. No need to chase.",
  },
  low: {
    kicker: "Quiet line",
    body: "Limited signal. We're listening, but there is little to act on right now.",
  },
};

function windowPhrase(days: number): { primary: string; suffix: string } {
  if (days > 90) return { primary: "—", suffix: "No clear window" };
  if (days <= 0) return { primary: "Now", suffix: "Window is open" };
  if (days <= 7) return { primary: `${days}`, suffix: days === 1 ? "day out" : "days out" };
  const weeks = Math.round(days / 7);
  return { primary: `${weeks}`, suffix: weeks === 1 ? "week out" : "weeks out" };
}

function lastSalePhrase(days: number): { primary: string; suffix: string } {
  if (days <= 0) return { primary: "Today", suffix: "Live markdown" };
  if (days < 30) return { primary: `${days}`, suffix: days === 1 ? "day ago" : "days ago" };
  const months = Math.round(days / 30);
  return { primary: `${months}`, suffix: months === 1 ? "month ago" : "months ago" };
}

export function SignalEditorial({ brand }: { brand: Brand }) {
  const copy = signalCopy[brand.signal];
  const win = windowPhrase(brand.windowDays);
  const last = lastSalePhrase(brand.lastSaleDays);

  return (
    <section aria-label="Signal at a glance" className="relative border border-border bg-card">
      {/* Top eyebrow rail */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3 md:px-10">
        <p className="eyebrow text-muted-foreground">The read · this week</p>
        <p className="eyebrow text-muted-foreground">
          Confidence <span className="ml-2 text-foreground">{brand.confidence}</span>
          <span className="text-muted-foreground">/100</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12">
        {/* Signal — editorial lead */}
        <div className="relative border-b border-border p-6 md:col-span-5 md:border-b-0 md:border-r md:p-10">
          <SignalBadge signal={brand.signal} />
          <p className="mt-6 font-serif text-[2.75rem] leading-[0.95] tracking-tight md:text-6xl">
            {copy.kicker}.
          </p>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
        </div>

        {/* Predicted window */}
        <Stat
          eyebrow="Predicted window"
          primary={win.primary}
          suffix={win.suffix}
          footnote={`Expected depth ${brand.expectedDepth}`}
          className="border-b border-border md:col-span-4 md:border-b-0 md:border-r"
        />

        {/* Last observed sale */}
        <Stat
          eyebrow="Last observed sale"
          primary={last.primary}
          suffix={last.suffix}
          footnote={brand.cadence || "Cadence still forming"}
          className="md:col-span-3"
        />
      </div>
    </section>
  );
}

function Stat({
  eyebrow,
  primary,
  suffix,
  footnote,
  className,
}: {
  eyebrow: string;
  primary: string;
  suffix: string;
  footnote: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col justify-between p-6 md:p-10 ${className ?? ""}`}>
      <p className="eyebrow">{eyebrow}</p>
      <div className="mt-8">
        <p className="font-serif text-[2.75rem] leading-[0.95] tracking-tight md:text-6xl">
          {primary}
        </p>
        <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {suffix}
        </p>
      </div>
      <p className="mt-8 text-xs leading-relaxed text-muted-foreground">{footnote}</p>
    </div>
  );
}
