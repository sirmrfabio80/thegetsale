import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BRAND_LOGOS_BUCKET = "brand-logos";

function publicLogoPrefix(): string {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${BRAND_LOGOS_BUCKET}/`;
}

function extractLogoPath(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null;
  const prefix = publicLogoPrefix();
  if (!logoUrl.startsWith(prefix)) return null;
  const rest = logoUrl.slice(prefix.length).split("?")[0];
  return rest || null;
}

async function ensureAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const HOUSE_GROUPS = [
  "Quiet luxury",
  "Heritage",
  "Runway signal",
  "Contemporary",
  "Emerging",
  "Archive / resale",
] as const;

export const HOUSE_STATUS_FILTERS = ["active", "inactive", "all"] as const;


export type HouseDTO = {
  id: string;
  name: string;
  slug: string;
  houseGroup: string | null;
  country: string | null;
  websiteUrl: string | null;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const HouseInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(80)
    .regex(slugRe, "Use lowercase letters, numbers and hyphens only"),
  houseGroup: z.string().trim().max(80).optional().nullable(),
  country: z.string().trim().max(80).optional().nullable(),
  websiteUrl: z
    .string()
    .trim()
    .max(300)
    .url("Must be a valid URL")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  description: z.string().trim().max(2000).optional().nullable(),
  isActive: z.boolean(),
});

function mapRow(r: any): HouseDTO {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    houseGroup: r.house_group ?? null,
    country: r.country ?? null,
    websiteUrl: r.website_url ?? null,
    description: r.description ?? null,
    logoUrl: r.logo_url ?? null,
    isActive: !!r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const listHouses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        search: z.string().trim().max(120).optional().nullable(),
        group: z.string().trim().max(80).optional().nullable(),
        status: z.enum(HOUSE_STATUS_FILTERS).optional().nullable(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<HouseDTO[]> => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);

    let q = supabase.from("brands").select("*").order("name", { ascending: true });
    if (data.search) q = q.ilike("name", `%${data.search}%`);
    if (data.group) q = q.eq("house_group", data.group);
    if (data.status === "active") q = q.eq("is_active", true);
    else if (data.status === "inactive") q = q.eq("is_active", false);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map(mapRow);
  });

function friendlySaveError(error: any): Error {
  const msg = error?.message ?? "Couldn't save house";
  if (error?.code === "23505" || /duplicate key|unique/i.test(msg)) {
    return new Error("That slug is already in use. Choose another.");
  }
  return new Error(msg);
}

export const createHouse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => HouseInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    const { error } = await supabase.from("brands").insert({
      name: data.name,
      slug: data.slug.toLowerCase(),
      house_group: data.houseGroup ?? null,
      country: data.country ?? null,
      website_url: data.websiteUrl ?? null,
      description: data.description ?? null,
      is_active: data.isActive,
    });
    if (error) throw friendlySaveError(error);
    return { ok: true };
  });

export const updateHouse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).and(HouseInput).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    const { error } = await supabase
      .from("brands")
      .update({
        name: data.name,
        slug: data.slug.toLowerCase(),
        house_group: data.houseGroup ?? null,
        country: data.country ?? null,
        website_url: data.websiteUrl ?? null,
        description: data.description ?? null,
        is_active: data.isActive,
      })
      .eq("id", data.id);
    if (error) throw friendlySaveError(error);
    return { ok: true };
  });

export const setHouseActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), isActive: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    const { error } = await supabase
      .from("brands")
      .update({ is_active: data.isActive })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setBrandLogoUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        brandId: z.string().uuid(),
        logoUrl: z.string().trim().url().max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);

    const prefix = publicLogoPrefix();
    if (!data.logoUrl.startsWith(prefix)) {
      throw new Error("Logo URL is not from the brand-logos bucket");
    }
    const newPath = data.logoUrl.slice(prefix.length).split("?")[0];
    if (!newPath || !newPath.startsWith(`${data.brandId}/`)) {
      throw new Error("Logo path must be under the brand's folder");
    }

    // Best-effort delete the previous object.
    const { data: existing } = await supabase
      .from("brands")
      .select("logo_url")
      .eq("id", data.brandId)
      .maybeSingle();
    const prevPath = extractLogoPath((existing as { logo_url?: string | null } | null)?.logo_url);
    if (prevPath && prevPath !== newPath) {
      try {
        await supabaseAdmin.storage.from(BRAND_LOGOS_BUCKET).remove([prevPath]);
      } catch {
        // ignore
      }
    }

    const { error } = await supabase
      .from("brands")
      .update({ logo_url: data.logoUrl })
      .eq("id", data.brandId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeBrandLogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ brandId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);

    const { data: existing } = await supabase
      .from("brands")
      .select("logo_url")
      .eq("id", data.brandId)
      .maybeSingle();
    const prevPath = extractLogoPath((existing as { logo_url?: string | null } | null)?.logo_url);
    if (prevPath) {
      try {
        await supabaseAdmin.storage.from(BRAND_LOGOS_BUCKET).remove([prevPath]);
      } catch {
        // ignore
      }
    }

    const { error } = await supabase
      .from("brands")
      .update({ logo_url: null })
      .eq("id", data.brandId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

