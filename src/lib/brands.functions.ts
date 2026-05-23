import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  deriveDashboardFields,
  type BrandRow,
  type EventRow,
  type PredictionRow,
} from "./brands.server";

export type HouseDashboardDTO = {
  id: string; // slug
  brandId: string; // uuid
  name: string;
  category: string;
  tagline: string;
  signal: "buy" | "soon" | "hold" | "low";
  confidenceScore: number;
  confidenceLabel: "low" | "medium" | "high";
  windowDays: number | null;
  lastSaleDays: number | null;
  expectedDepth: string;
  cadence: string | null;
  headline: string;
  isFallback: boolean;
  websiteUrl: string | null;
};

export type HouseHistoryItem = { date: string; label: string; depth: string };

export type HouseDetailDTO = HouseDashboardDTO & {
  editorialCopy: string | null;
  history: HouseHistoryItem[];
  factors: { title: string; note: string }[];
  algorithmVersion: string;
};

export type PublicHouseDTO = {
  id: string;
  name: string;
  category: string;
  tagline: string;
  cadence: string | null;
  lastSaleDays: number | null;
  websiteUrl: string | null;
};

function depthLabel(min: number | null, max: number | null): string {
  if (min != null && max != null) return `${min}–${max}%`;
  if (max != null) return `Up to ${max}%`;
  if (min != null) return `From ${min}%`;
  return "—";
}

function pickLatestPrediction(rows: PredictionRow[] | null): PredictionRow | null {
  if (!rows || rows.length === 0) return null;
  return [...rows].sort((a, b) => (a.predicted_start_date < b.predicted_start_date ? 1 : -1))[0];
}

function toDashboardDTO(
  brand: BrandRow & { website_url?: string | null },
  events: EventRow[],
  prediction: PredictionRow | null,
): HouseDashboardDTO {
  const d = deriveDashboardFields(events, prediction);
  return {
    id: brand.slug,
    brandId: brand.id,
    name: brand.name,
    category: brand.category ?? "",
    tagline: brand.tagline ?? "",
    signal: d.signal,
    confidenceScore: d.confidenceScore,
    confidenceLabel: d.confidenceLabel,
    windowDays: d.windowDays,
    lastSaleDays: d.lastSaleDays,
    expectedDepth: d.expectedDepth,
    cadence: d.cadence,
    headline: d.headline,
    isFallback: d.isFallback,
    websiteUrl: brand.website_url ?? null,
  };
}

const BRAND_COLS = "id, slug, name, category, tagline, editorial_copy, website_url";
const EVENT_COLS = "brand_id, start_date, discount_min, discount_max, admin_notes, status";
const PREDICTION_COLS =
  "brand_id, predicted_start_date, confidence_score, confidence_label, signal, reasoning_summary, algorithm_version, status";

export const listHousesForDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HouseDashboardDTO[]> => {
    const { supabase } = context;

    const { data: brands, error: bErr } = await supabase
      .from("brands")
      .select(BRAND_COLS)
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (bErr) throw new Error(bErr.message);
    if (!brands || brands.length === 0) return [];

    const ids = brands.map((b: any) => b.id);

    const [{ data: events }, { data: preds }] = await Promise.all([
      supabase.from("sale_events").select(EVENT_COLS).in("brand_id", ids).eq("status", "published"),
      supabase
        .from("sale_predictions")
        .select(PREDICTION_COLS)
        .in("brand_id", ids)
        .eq("status", "published"),
    ]);

    const eventsByBrand = new Map<string, EventRow[]>();
    for (const e of (events ?? []) as any[]) {
      const arr = eventsByBrand.get(e.brand_id) ?? [];
      arr.push(e);
      eventsByBrand.set(e.brand_id, arr);
    }
    const predsByBrand = new Map<string, PredictionRow[]>();
    for (const p of (preds ?? []) as any[]) {
      const arr = predsByBrand.get(p.brand_id) ?? [];
      arr.push(p);
      predsByBrand.set(p.brand_id, arr);
    }

    return (brands as any[]).map((b) =>
      toDashboardDTO(
        b as unknown as BrandRow,
        eventsByBrand.get(b.id) ?? [],
        pickLatestPrediction(predsByBrand.get(b.id) ?? null),
      ),
    );
  });

const SlugInput = z.object({ slug: z.string().min(1).max(120) });

export const getHouseDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SlugInput.parse(input))
  .handler(async ({ data, context }): Promise<HouseDetailDTO | null> => {
    const { supabase } = context;

    const { data: brand, error } = await supabase
      .from("brands")
      .select(BRAND_COLS + ", is_active")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!brand || !(brand as any).is_active) return null;

    const brandId = (brand as any).id;

    const [{ data: events }, { data: preds }] = await Promise.all([
      supabase
        .from("sale_events")
        .select(EVENT_COLS)
        .eq("brand_id", brandId)
        .eq("status", "published")
        .order("start_date", { ascending: false }),
      supabase
        .from("sale_predictions")
        .select(PREDICTION_COLS)
        .eq("brand_id", brandId)
        .eq("status", "published"),
    ]);

    const eventRows = (events ?? []) as EventRow[];
    const prediction = pickLatestPrediction(((preds ?? []) as PredictionRow[]) || null);
    const base = toDashboardDTO(brand as unknown as BrandRow, eventRows, prediction);

    const history: HouseHistoryItem[] = eventRows.map((e) => ({
      date: e.start_date,
      label: e.admin_notes ?? "Sale",
      depth: depthLabel(e.discount_min, e.discount_max),
    }));

    return {
      ...base,
      editorialCopy: (brand as any).editorial_copy ?? null,
      history,
      factors: [],
      algorithmVersion: prediction?.algorithm_version ?? "none",
    };
  });

// Public preview — no auth, strictly trimmed.
export const getPublicHouseDetail = createServerFn({ method: "POST" })
  .inputValidator((input) => SlugInput.parse(input))
  .handler(async ({ data }): Promise<PublicHouseDTO | null> => {
    const { data: brand, error } = await supabaseAdmin
      .from("brands")
      .select("id, slug, name, category, tagline, website_url, is_active")
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!brand) return null;

    const { data: events } = await supabaseAdmin
      .from("sale_events")
      .select("start_date, discount_min, discount_max, status")
      .eq("brand_id", (brand as any).id)
      .eq("status", "published");

    const eventRows = ((events ?? []) as any[]).map((e) => ({
      start_date: e.start_date,
      discount_min: e.discount_min,
      discount_max: e.discount_max,
      admin_notes: null, // never expose
    })) as EventRow[];

    const d = deriveDashboardFields(eventRows, null);

    return {
      id: (brand as any).slug,
      name: (brand as any).name,
      category: (brand as any).category ?? "",
      tagline: (brand as any).tagline ?? "",
      cadence: d.cadence,
      lastSaleDays: d.lastSaleDays,
      websiteUrl: (brand as any).website_url ?? null,
    };
  });
