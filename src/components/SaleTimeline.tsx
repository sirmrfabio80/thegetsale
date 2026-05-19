import type { SaleEvent, SignalFactor } from "@/data/types";

export function SaleTimeline({ events }: { events: SaleEvent[] }) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {events.map((e) => (
        <li key={e.date} className="flex items-baseline justify-between gap-6 py-5">
          <div className="min-w-0">
            <p className="font-serif text-xl leading-tight">{e.label}</p>
            <p className="eyebrow mt-1">{formatDate(e.date)}</p>
          </div>
          <p className="shrink-0 font-serif text-lg text-muted-foreground">{e.depth}</p>
        </li>
      ))}
    </ul>
  );
}

export function WhySignalPanel({ factors }: { factors: SignalFactor[] }) {
  return (
    <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-2">
      {factors.map((f) => (
        <div key={f.title} className="bg-card p-6">
          <p className="eyebrow mb-2">{f.title}</p>
          <p className="text-sm leading-relaxed text-foreground/90">{f.note}</p>
        </div>
      ))}
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
