import { cn } from "@/lib/utils";
import type { SignalKind } from "@/data/types";

const labels: Record<SignalKind, string> = {
  soon: "Wait for sale",
  hold: "Hold",
  buy: "Buy now",
  low: "No clear read",
};

const tones: Record<SignalKind, string> = {
  soon: "border-[color:var(--signal-soon)]/40 text-[color:var(--signal-soon)] bg-[color:var(--signal-soon)]/5",
  hold: "border-[color:var(--signal-hold)]/40 text-[color:var(--signal-hold)] bg-[color:var(--signal-hold)]/5",
  buy: "border-[color:var(--signal-buy)]/40 text-[color:var(--signal-buy)] bg-[color:var(--signal-buy)]/5",
  low: "border-[color:var(--signal-low)]/50 text-muted-foreground bg-muted/40",
};

export function SignalBadge({ signal, className }: { signal: SignalKind; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]",
        tones[signal],
        className,
      )}
    >
      <span
        className="h-1 w-1 rounded-full"
        style={{ backgroundColor: `var(--signal-${signal})` }}
      />
      {labels[signal]}
    </span>
  );
}
