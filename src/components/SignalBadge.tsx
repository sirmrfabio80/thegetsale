import { cn } from "@/lib/utils";
import type { SignalKind } from "@/data/types";

const labels: Record<Exclude<SignalKind, "low">, string> = {
  soon: "Wait for sale",
  hold: "Hold",
  buy: "Buy now",
};

const tones: Record<Exclude<SignalKind, "low">, string> = {
  soon: "border-[color:var(--signal-soon)]/40 text-[color:var(--signal-soon)] bg-[color:var(--signal-soon-wash)]",
  hold: "border-[color:var(--signal-hold)]/40 text-[color:var(--signal-hold)] bg-[color:var(--signal-hold-wash)]",
  buy: "border-[color:var(--signal-buy)]/40 text-[color:var(--signal-buy)] bg-[color:var(--signal-buy-wash)]",
};

export function SignalBadge({ signal, className }: { signal: SignalKind; className?: string }) {
  if (signal === "low") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 text-xs text-muted-foreground",
          className,
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-border" aria-hidden />
        Awaiting signal
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border px-2.5 py-1 text-[10px] badge-shape",
        "uppercase-token tracking-token",
        tones[signal],
        className,
      )}
      style={{
        textTransform: "var(--label-transform)" as React.CSSProperties["textTransform"],
        letterSpacing: "var(--label-tracking)",
      }}
    >
      <span
        className="h-1.5 w-1.5"
        style={{ backgroundColor: `var(--signal-${signal})` }}
        aria-hidden
      />
      {labels[signal]}
    </span>
  );
}
