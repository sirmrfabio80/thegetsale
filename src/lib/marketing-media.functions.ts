import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "marketing-media";
const SIGN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days — refreshed by React Query on remount

export type HeroMediaUrls = {
  webm: string | null;
  mp4: string | null;
  poster: string | null;
};

export type HeroMediaFile = {
  path: "hero-summer.webm" | "hero-summer.mp4" | "hero-summer-poster.jpg";
  updatedAt: string | null;
  sizeBytes: number | null;
};

const PATHS = {
  webm: "hero-summer.webm",
  mp4: "hero-summer.mp4",
  poster: "hero-summer-poster.jpg",
} as const;

/** Public: returns short-lived signed URLs for the hero assets, or null when a file isn't uploaded yet. */
export const getHeroMediaUrls = createServerFn({ method: "GET" }).handler(
  async (): Promise<HeroMediaUrls> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    async function sign(path: string): Promise<string | null> {
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(path, SIGN_TTL_SECONDS);
      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    }

    const [webm, mp4, poster] = await Promise.all([
      sign(PATHS.webm),
      sign(PATHS.mp4),
      sign(PATHS.poster),
    ]);
    return { webm, mp4, poster };
  },
);

/** Admin: list metadata for the three hero assets so the UI can show what's uploaded. */
export const listHeroMediaFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HeroMediaFile[]> => {
    const { supabase, userId } = context;
    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).list("", { limit: 100 });
    if (error) throw new Error(error.message);

    const byName = new Map((data ?? []).map((o) => [o.name, o]));
    return (Object.values(PATHS) as HeroMediaFile["path"][]).map((path) => {
      const o = byName.get(path);
      return {
        path,
        updatedAt: (o?.updated_at as string | undefined) ?? null,
        sizeBytes:
          (o?.metadata as { size?: number } | null | undefined)?.size ?? null,
      };
    });
  });

/** Admin: remove a single hero asset. */
export const deleteHeroMediaFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { path: string }) => {
    const allowed = new Set<string>(Object.values(PATHS));
    if (!allowed.has(data.path)) throw new Error("Invalid path");
    return data;
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage.from(BUCKET).remove([data.path]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
