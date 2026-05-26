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

export type BrandLinkDTO = { countryCode: string; url: string };

export type DashboardResultDTO = {
  houses: HouseDashboardDTO[];
  needsMarket: boolean;
  market: string | null;
};

export type HouseDashboardDTO = {
  id: string; // slug
  brandId: string; // uuid
  name: string;
  categories: string[];
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
  logoUrl: string | null;
};

export type HouseHistoryItem = { date: string; label: string; depth: string };

export type HouseDetailDTO = HouseDashboardDTO & {
  editorialCopy: string | null;
  history: HouseHistoryItem[];
  factors: { title: string; note: string }[];
  algorithmVersion: string;
  links: BrandLinkDTO[];
  needsMarket: boolean;
  market: string | null;
};

export type PublicHouseDTO = {
  id: string;
  name: string;
  categories: string[];
  tagline: string;
  cadence: string | null;
  lastSaleDays: number | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  links: BrandLinkDTO[];
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

function normaliseCategories(brand: { categories?: string[] | null; category?: string | null }): string[] {
  const arr = Array.isArray(brand.categories) ? brand.categories.filter((c) => !!c) : [];
  if (arr.length > 0) return arr;
  if (brand.category) return [brand.category];
  return [];
}

function toDashboardDTO(
  brand: BrandRow & { website_url?: string | null; logo_url?: string | null },
  events: EventRow[],
  prediction: PredictionRow | null,
): HouseDashboardDTO {
  const d = deriveDashboardFields(events, prediction);
  return {
    id: brand.slug,
    brandId: brand.id,
    name: brand.name,
    categories: normaliseCategories(brand),
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
    logoUrl: brand.logo_url ?? null,
  };
}

const BRAND_COLS =
  "id, slug, name, category, categories, tagline, editorial_copy, website_url, logo_url";
const EVENT_COLS = "brand_id, start_date, discount_min, discount_max, admin_notes, status";
const PREDICTION_COLS =
  "brand_id, predicted_start_date, confidence_score, confidence_label, signal, reasoning_summary, algorithm_version, status";

async function getUserMarket(
  supabase: { from: (t: string) => any },
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("market")
    .eq("id", userId)
    .maybeSingle();
  return (data as { market?: string | null } | null)?.market ?? null;
}

function applyMarketFilter<T extends { or: (expr: string) => T }>(
  query: T,
  market: string,
): T {
  // Show events for the user's market plus global (NULL) events.
  return query.or(`country_code.eq.${market},country_code.is.null`);
}

export const listHousesForDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardResultDTO> => {
    const { supabase, userId } = context;

    const market = await getUserMarket(supabase, userId);

    const { data: brands, error: bErr } = await supabase
      .from("brands")
      .select(BRAND_COLS)
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (bErr) throw new Error(bErr.message);
    if (!brands || brands.length === 0) {
      return { houses: [], needsMarket: !market, market };
    }

    const ids = brands.map((b: any) => b.id);

    // If the user has no market set, return brand cards without any sale
    // event data so the UI can show a "set your market" prompt.
    if (!market) {
      const houses = (brands as any[]).map((b) =>
        toDashboardDTO(b as unknown as BrandRow, [], null),
      );
      return { houses, needsMarket: true, market: null };
    }

    const [{ data: events }, { data: preds }] = await Promise.all([
      applyMarketFilter(
        supabase.from("sale_events").select(EVENT_COLS).in("brand_id", ids).eq("status", "published"),
        market,
      ),
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

    const houses = (brands as any[]).map((b) =>
      toDashboardDTO(
        b as unknown as BrandRow,
        eventsByBrand.get(b.id) ?? [],
        pickLatestPrediction(predsByBrand.get(b.id) ?? null),
      ),
    );

    return { houses, needsMarket: false, market };
  });

const SlugInput = z.object({ slug: z.string().min(1).max(120) });

async function fetchBrandLinks(
  client: { from: (t: string) => any },
  brandId: string,
): Promise<BrandLinkDTO[]> {
  const { data, error } = await client
    .from("brand_links")
    .select("country_code, url")
    .eq("brand_id", brandId);
  if (error) return [];
  return ((data ?? []) as any[]).map((r) => ({
    countryCode: String(r.country_code),
    url: String(r.url),
  }));
}

export const getHouseDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SlugInput.parse(input))
  .handler(async ({ data, context }): Promise<HouseDetailDTO | null> => {
    const { supabase, userId } = context;

    const market = await getUserMarket(supabase, userId);

    const { data: brand, error } = await supabase
      .from("brands")
      .select(BRAND_COLS + ", is_active")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!brand || !(brand as any).is_active) return null;

    const brandId = (brand as any).id;

    const [eventsResult, { data: preds }, links] = await Promise.all([
      market
        ? applyMarketFilter(
            supabase
              .from("sale_events")
              .select(EVENT_COLS)
              .eq("brand_id", brandId)
              .eq("status", "published"),
            market,
          ).order("start_date", { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
      supabase
        .from("sale_predictions")
        .select(PREDICTION_COLS)
        .eq("brand_id", brandId)
        .eq("status", "published"),
      fetchBrandLinks(supabase, brandId),
    ]);

    const eventRows = ((eventsResult?.data ?? []) as EventRow[]);
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
      links,
      needsMarket: !market,
      market,
    };
  });


// Public preview — no auth, strictly trimmed.
export const getPublicHouseDetail = createServerFn({ method: "POST" })
  .inputValidator((input) => SlugInput.parse(input))
  .handler(async ({ data }): Promise<PublicHouseDTO | null> => {
    const { data: brand, error } = await supabaseAdmin
      .from("brands")
      .select("id, slug, name, category, categories, tagline, website_url, is_active")
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!brand) return null;

    const [{ data: events }, links] = await Promise.all([
      supabaseAdmin
        .from("sale_events")
        .select("start_date, discount_min, discount_max, status")
        .eq("brand_id", (brand as any).id)
        .eq("status", "published"),
      fetchBrandLinks(supabaseAdmin, (brand as any).id),
    ]);

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
      categories: normaliseCategories(brand as any),
      tagline: (brand as any).tagline ?? "",
      cadence: d.cadence,
      lastSaleDays: d.lastSaleDays,
      websiteUrl: (brand as any).website_url ?? null,
      links,
    };
  });
