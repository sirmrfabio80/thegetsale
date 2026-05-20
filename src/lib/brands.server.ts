// Server-only pure helpers for deriving dashboard fields from
// brand catalogue rows, published sale events, and published predictions.
// No DB calls inside — easy to unit-test.

export type SignalKind = "buy" | "soon" | "hold" | "low";
export type ConfidenceLabel = "low" | "medium" | "high";

export type BrandRow = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  tagline: string | null;
  editorial_copy: string | null;
};

export type EventRow = {
  start_date: string;
  discount_min: number | null;
  discount_max: number | null;
  admin_notes: string | null;
};

export type PredictionRow = {
  predicted_start_date: string;
  confidence_score: number | string; // numeric arrives as string sometimes
  confidence_label: string;
  signal: string | null;
  reasoning_summary: string | null;
  algorithm_version: string;
};

export type DerivedFields = {
  signal: SignalKind;
  confidenceScore: number; // 0-100
  confidenceLabel: ConfidenceLabel;
  windowDays: number | null;
  lastSaleDays: number | null;
  expectedDepth: string;
  cadence: string | null;
  headline: string;
  algorithmVersion: string;
  isFallback: boolean;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / MS_PER_DAY);
}

function asScore(raw: number | string): number {
  const n = typeof raw === "string" ? Number(raw) : raw;
  if (!Number.isFinite(n)) return 0;
  // Stored as 0..1; surface as 0..100.
  return Math.max(0, Math.min(100, Math.round(n * 100)));
}

function asLabel(raw: string | null | undefined): ConfidenceLabel {
  return raw === "high" || raw === "medium" || raw === "low" ? raw : "low";
}

function asSignal(raw: string | null | undefined): SignalKind | null {
  return raw === "buy" || raw === "soon" || raw === "hold" || raw === "low"
    ? raw
    : null;
}

function formatDepth(min: number | null, max: number | null): string {
  if (min != null && max != null) return `${min}–${max}%`;
  if (max != null) return `Up to ${max}%`;
  if (min != null) return `From ${min}%`;
  return "—";
}

function describeCadence(events: EventRow[]): string | null {
  if (events.length < 2) return null;
  const sorted = [...events].sort((a, b) => (a.start_date < b.start_date ? 1 : -1));
  const recent = sorted.slice(0, 4);
  const gaps: number[] = [];
  for (let i = 0; i < recent.length - 1; i++) {
    const a = new Date(recent[i].start_date);
    const b = new Date(recent[i + 1].start_date);
    gaps.push(Math.abs(daysBetween(a, b)));
  }
  if (gaps.length === 0) return null;
  gaps.sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];
  const weeks = Math.max(1, Math.round(median / 7));
  return `Sales roughly every ${weeks} weeks.`;
}

export function deriveDashboardFields(
  events: EventRow[],
  prediction: PredictionRow | null,
  now: Date = new Date(),
): DerivedFields {
  const signal = prediction ? asSignal(prediction.signal) : null;
  const isFallback = signal == null;

  let windowDays: number | null = null;
  if (prediction?.predicted_start_date) {
    const d = new Date(prediction.predicted_start_date);
    const diff = daysBetween(d, now);
    windowDays = Math.max(0, diff);
  }

  let lastSaleDays: number | null = null;
  const past = events
    .filter((e) => new Date(e.start_date).getTime() <= now.getTime())
    .sort((a, b) => (a.start_date < b.start_date ? 1 : -1));
  if (past.length > 0) {
    lastSaleDays = Math.max(0, daysBetween(now, new Date(past[0].start_date)));
  }

  const mostRecent = past[0] ?? events[0] ?? null;
  const expectedDepth = mostRecent
    ? formatDepth(mostRecent.discount_min, mostRecent.discount_max)
    : "—";

  return {
    signal: signal ?? "low",
    confidenceScore: prediction ? asScore(prediction.confidence_score) : 0,
    confidenceLabel: prediction ? asLabel(prediction.confidence_label) : "low",
    windowDays,
    lastSaleDays,
    expectedDepth,
    cadence: describeCadence(events),
    headline: prediction?.reasoning_summary ?? "Watching quietly.",
    algorithmVersion: prediction?.algorithm_version ?? "none",
    isFallback,
  };
}
