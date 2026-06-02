export interface SignalCounts {
  buy: number;
  wait: number;
  hold: number;
  low: number;
  total: number;
}

const SEGMENTS: ReadonlyArray<{ key: "buy" | "wait" | "hold" | "low"; token: string; label: string }> = [
  { key: "buy", token: "var(--signal-buy)", label: "Buy" },
  { key: "wait", token: "var(--signal-soon)", label: "Soon" },
  { key: "hold", token: "var(--signal-hold)", label: "Hold" },
  { key: "low", token: "var(--signal-low)", label: "Low" },
];

export function SignalDistribution({ counts }: { counts: SignalCounts }) {
  if (counts.total <= 0) return null;
  return (
    <div
      role="img"
      aria-label={`Signal distribution: ${counts.buy} buy, ${counts.wait} soon, ${counts.hold} hold, ${counts.low} low.`}
      className="flex h-1.5 w-full overflow-hidden border border-border bg-background"
    >
      {SEGMENTS.map((s, i) => {
        const v = counts[s.key];
        if (v <= 0) return null;
        return (
          <span
            key={s.key}
            className="meter-fill block h-full"
            style={{
              flex: v,
              backgroundColor: s.token,
              animationDelay: `${i * 80}ms`,
            }}
          />
        );
      })}
    </div>
  );
}
