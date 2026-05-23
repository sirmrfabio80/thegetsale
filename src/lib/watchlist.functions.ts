import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WatchlistEntryDTO = {
  brandId: string; // slug (stable client key)
  brandUuid: string;
  addedAt: string;
};

const SlugInput = z.object({ slug: z.string().min(1).max(120) });
const SlugListInput = z.object({
  slugs: z.array(z.string().min(1).max(120)).min(1).max(100),
});

async function resolveBrandId(supabase: any, slug: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("brands")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? (data as { id: string }).id : null;
}

export const listWatchlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WatchlistEntryDTO[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_watchlist")
      .select("brand_id, added_at, brands!inner(slug, is_active)")
      .eq("user_id", userId)
      .order("added_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as any[])
      .filter((r) => r.brands?.is_active)
      .map((r) => ({
        brandId: r.brands.slug,
        brandUuid: r.brand_id,
        addedAt: r.added_at,
      }));
  });

export const addToWatchlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SlugInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const brandId = await resolveBrandId(supabase, data.slug);
    if (!brandId) throw new Error("House not found");
    const { error } = await supabase
      .from("user_watchlist")
      .upsert(
        { user_id: userId, brand_id: brandId },
        { onConflict: "user_id,brand_id", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
    return { ok: true as const, slug: data.slug, brandId };
  });

export const removeFromWatchlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SlugInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const brandId = await resolveBrandId(supabase, data.slug);
    if (!brandId) return { ok: true as const, slug: data.slug };
    const { error } = await supabase
      .from("user_watchlist")
      .delete()
      .eq("user_id", userId)
      .eq("brand_id", brandId);
    if (error) throw new Error(error.message);
    return { ok: true as const, slug: data.slug, brandId };
  });

export const removeManyFromWatchlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SlugListInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: brandRows, error: brandErr } = await supabase
      .from("brands")
      .select("id, slug")
      .in("slug", data.slugs);
    if (brandErr) throw new Error(brandErr.message);
    const ids = ((brandRows ?? []) as { id: string }[]).map((b) => b.id);
    if (ids.length === 0) return { ok: true as const, removed: 0 };
    const { error } = await supabase
      .from("user_watchlist")
      .delete()
      .eq("user_id", userId)
      .in("brand_id", ids);
    if (error) throw new Error(error.message);
    return { ok: true as const, removed: ids.length };
  });
