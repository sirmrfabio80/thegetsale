import type { SignalKind } from "@/data/types";
import { useCountUp } from "@/hooks/use-count-up";

interface ConfidenceArcProps {
  score: number;
  signal: SignalKind;
  size?: number;
}

export function ConfidenceArc({ score, signal, size = 28 }: ConfidenceArcProps) {
  const value = useCountUp(score, 900);
  const stroke = 2;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = c * (1 - clamped / 100);

  return (
    <span className="inline-flex items-center gap-2 [font-variant-numeric:tabular-nums]">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
        className="block shrink-0 -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`var(--signal-${signal})`}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-foreground">{value}</span>
      <span className="text-muted-foreground">/100</span>
    </span>
  );
}
