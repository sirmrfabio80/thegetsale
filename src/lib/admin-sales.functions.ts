import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const SALE_TYPES = [
  "seasonal",
  "mid_season",
  "private",
  "flash",
  "archive",
  "other",
] as const;

export const SALE_STATUSES = ["draft", "published", "hidden"] as const;

export type SaleEventDTO = {
  id: string;
  brandId: string;
  brandName: string | null;
  category: string | null;
  saleType: string;
  startDate: string;
  endDate: string | null;
  discountMin: number | null;
  discountMax: number | null;
  status: string;
  adminNotes: string | null;
};

export type BrandOption = { id: string; name: string };

const SaleInput = z
  .object({
    brandId: z.string().uuid(),
    category: z.string().trim().max(80).optional().nullable(),
    saleType: z.enum(SALE_TYPES),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
    discountMin: z.number().int().min(0).max(90).optional().nullable(),
    discountMax: z.number().int().min(0).max(90).optional().nullable(),
    status: z.enum(SALE_STATUSES),
    adminNotes: z.string().max(2000).optional().nullable(),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    message: "End date can't be before start date",
    path: ["endDate"],
  })
  .refine((v) => v.discountMin == null || v.discountMax == null || v.discountMax >= v.discountMin, {
    message: "Max discount can't be lower than min",
    path: ["discountMax"],
  });

function mapRow(r: any, brandName: string | null): SaleEventDTO {
  return {
    id: r.id,
    brandId: r.brand_id,
    brandName,
    category: r.category ?? null,
    saleType: r.sale_type,
    startDate: r.start_date,
    endDate: r.end_date,
    discountMin: r.discount_min,
    discountMax: r.discount_max,
    status: r.status,
    adminNotes: r.admin_notes,
  };
}

export const listBrandOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BrandOption[]> => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);

    // Active houses available for new sale events
    const { data: active, error } = await supabase
      .from("brands")
      .select("id, name, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);

    // Also include inactive brands already attached to a sale event so
    // existing rows remain readable in the dropdown.
    const { data: usedRows } = await supabase.from("sale_events").select("brand_id");
    const usedIds = Array.from(new Set((usedRows ?? []).map((r: any) => r.brand_id)));
    const activeIds = new Set((active ?? []).map((b: any) => b.id));
    const missingIds = usedIds.filter((id) => !activeIds.has(id));

    const merged: BrandOption[] = (active ?? []).map((b: any) => ({
      id: b.id,
      name: b.name,
    }));

    if (missingIds.length) {
      const { data: extras } = await supabase
        .from("brands")
        .select("id, name")
        .in("id", missingIds);
      for (const b of extras ?? []) {
        merged.push({ id: (b as any).id, name: `${(b as any).name} (inactive)` });
      }
    }

    merged.sort((a, b) => a.name.localeCompare(b.name));
    return merged;
  });

export const listSaleEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        brandId: z.string().uuid().optional().nullable(),
        category: z.string().trim().max(80).optional().nullable(),
        saleType: z.enum(SALE_TYPES).optional().nullable(),
        status: z.enum(SALE_STATUSES).optional().nullable(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<SaleEventDTO[]> => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);

    let q = supabase.from("sale_events").select("*").order("start_date", { ascending: false });

    if (data.brandId) q = q.eq("brand_id", data.brandId);
    if (data.category) q = q.ilike("category", `%${data.category}%`);
    if (data.saleType) q = q.eq("sale_type", data.saleType);
    if (data.status) q = q.eq("status", data.status);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const brandIds = Array.from(new Set((rows ?? []).map((r: any) => r.brand_id)));
    const brandsById = new Map<string, string>();
    if (brandIds.length) {
      const { data: brands } = await supabase.from("brands").select("id, name").in("id", brandIds);
      for (const b of brands ?? []) brandsById.set((b as any).id, (b as any).name);
    }

    return (rows ?? []).map((r: any) => mapRow(r, brandsById.get(r.brand_id) ?? null));
  });

export const createSaleEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SaleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    const { error } = await supabase.from("sale_events").insert({
      brand_id: data.brandId,
      category: data.category ?? null,
      sale_type: data.saleType,
      start_date: data.startDate,
      end_date: data.endDate ?? null,
      discount_min: data.discountMin ?? null,
      discount_max: data.discountMax ?? null,
      status: data.status,
      admin_notes: data.adminNotes ?? null,
      created_by: userId,
      source_type: "admin_confirmed",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateSaleEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).and(SaleInput).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    const { error } = await supabase
      .from("sale_events")
      .update({
        brand_id: data.brandId,
        category: data.category ?? null,
        sale_type: data.saleType,
        start_date: data.startDate,
        end_date: data.endDate ?? null,
        discount_min: data.discountMin ?? null,
        discount_max: data.discountMax ?? null,
        status: data.status,
        admin_notes: data.adminNotes ?? null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setSaleEventStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), status: z.enum(SALE_STATUSES) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    const { error } = await supabase
      .from("sale_events")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSaleEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    const { error } = await supabase.from("sale_events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const bulkSetSaleEventStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(1).max(500),
        status: z.enum(SALE_STATUSES),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    const { error } = await supabase
      .from("sale_events")
      .update({ status: data.status })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });

export const bulkDeleteSaleEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    const { error } = await supabase.from("sale_events").delete().in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });
