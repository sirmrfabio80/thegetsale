import { Link } from "@tanstack/react-router";
import type { Brand } from "@/data/types";
import { SignalBadge } from "./SignalBadge";

export function BrandCard({ brand, forYou = false }: { brand: Brand; forYou?: boolean }) {
  return (
    <Link
      to="/brand/$id"
      params={{ id: brand.id }}
      className="group block border border-border bg-card px-5 py-6 transition-all md:hover:-translate-y-px md:hover:border-foreground/20"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">{brand.category}</p>
          <h3 className="font-serif text-2xl leading-tight">{brand.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{brand.tagline}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <SignalBadge signal={brand.signal} />
          {forYou && (
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              For you
            </span>
          )}
        </div>
      </div>

      <div className="hairline mt-6" />

      <div className="mt-5 grid grid-cols-3 gap-4 text-[12px]">
        <Stat label="Confidence" value={`${brand.confidence}%`} />
        <Stat label="Window" value={brand.windowDays > 90 ? "—" : `${brand.windowDays}d`} />
        <Stat label="Depth" value={brand.expectedDepth} />
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow mb-1">{label}</p>
      <p className="font-serif text-lg">{value}</p>
    </div>
  );
}
