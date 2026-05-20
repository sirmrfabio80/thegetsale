import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SetupHouseDTO = { slug: string; name: string };
export type SetupHouseGroupDTO = { label: string; houses: SetupHouseDTO[] };
export type SetupCategoryDTO = { slug: string; label: string };
export type SetupStyleDTO = { slug: string; label: string; description: string };

export type SetupOptionsDTO = {
  houseGroups: SetupHouseGroupDTO[];
  categories: SetupCategoryDTO[];
  styles: SetupStyleDTO[];
};

const UNGROUPED_LABEL = "All houses";

export const listSetupOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SetupOptionsDTO> => {
    const { supabase } = context;

    const [housesRes, catsRes, stylesRes] = await Promise.all([
      supabase
        .from("brands")
        .select("slug, name, house_group")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("product_categories")
        .select("slug, label")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("style_tags")
        .select("slug, label, description")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

    if (housesRes.error) throw new Error(housesRes.error.message);
    if (catsRes.error) throw new Error(catsRes.error.message);
    if (stylesRes.error) throw new Error(stylesRes.error.message);

    // Group houses by house_group; rows without a group fall into "All houses".
    const groups = new Map<string, SetupHouseDTO[]>();
    for (const row of housesRes.data ?? []) {
      const label = row.house_group?.trim() || UNGROUPED_LABEL;
      const list = groups.get(label) ?? [];
      list.push({ slug: row.slug, name: row.name });
      groups.set(label, list);
    }
    // Stable order: named groups first (alphabetical), then "All houses" last.
    const houseGroups: SetupHouseGroupDTO[] = [...groups.entries()]
      .sort(([a], [b]) => {
        if (a === UNGROUPED_LABEL) return 1;
        if (b === UNGROUPED_LABEL) return -1;
        return a.localeCompare(b);
      })
      .map(([label, houses]) => ({ label, houses }));

    return {
      houseGroups,
      categories: (catsRes.data ?? []).map((c) => ({
        slug: c.slug,
        label: c.label,
      })),
      styles: (stylesRes.data ?? []).map((s) => ({
        slug: s.slug,
        label: s.label,
        description: s.description ?? "",
      })),
    };
  });
