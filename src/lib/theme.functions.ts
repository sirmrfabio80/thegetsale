import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { defaultTokens } from "@/lib/theme/registry";
import { sanitizeTokens } from "@/lib/theme/css";

export interface ThemeRecord {
  key: string;
  name: string;
  tokens: Record<string, string>;
  is_active: boolean;
}

export interface ActiveTheme {
  key: string;
  name: string;
  tokens: Record<string, string>;
}

const FALLBACK_ACTIVE: ActiveTheme = {
  key: "editorial",
  name: "Editorial",
  tokens: defaultTokens(),
};

/** Public, no-auth: read the active theme for SSR injection. */
export const getActiveTheme = createServerFn({ method: "GET" }).handler(
  async (): Promise<ActiveTheme> => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return FALLBACK_ACTIVE;
    const supabase = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from("themes")
      .select("key,name,tokens")
      .eq("is_active", true)
      .maybeSingle();
    if (error || !data) return FALLBACK_ACTIVE;
    return {
      key: data.key,
      name: data.name,
      tokens: (data.tokens as Record<string, string> | null) ?? {},
    };
  },
);

type AuthCtx = { supabase: { rpc: typeof import("@/integrations/supabase/client").supabase.rpc }; userId: string };

async function assertAdmin(context: AuthCtx) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const listThemes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ThemeRecord[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("themes")
      .select("key,name,tokens,is_active")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      key: row.key,
      name: row.name,
      tokens: (row.tokens as Record<string, string> | null) ?? {},
      is_active: row.is_active,
    }));
  });

export const getTheme = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ key: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }): Promise<ThemeRecord | null> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("themes")
      .select("key,name,tokens,is_active")
      .eq("key", data.key)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return {
      key: row.key,
      name: row.name,
      tokens: (row.tokens as Record<string, string> | null) ?? {},
      is_active: row.is_active,
    };
  });

const TokensSchema = z.record(z.string(), z.string());

export const upsertThemeTokens = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ key: z.string().min(1), tokens: TokensSchema }).parse(input),
  )
  .handler(async ({ data, context }): Promise<ThemeRecord> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cleaned = sanitizeTokens(data.tokens);

    const { data: existing, error: readErr } = await supabaseAdmin
      .from("themes")
      .select("tokens")
      .eq("key", data.key)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!existing) throw new Error(`Theme not found: ${data.key}`);

    const merged = {
      ...((existing.tokens as Record<string, string> | null) ?? {}),
      ...cleaned,
    };

    const { data: row, error } = await supabaseAdmin
      .from("themes")
      .update({ tokens: merged })
      .eq("key", data.key)
      .select("key,name,tokens,is_active")
      .single();
    if (error) throw new Error(error.message);
    return {
      key: row.key,
      name: row.name,
      tokens: (row.tokens as Record<string, string> | null) ?? {},
      is_active: row.is_active,
    };
  });

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "theme";
}

export const createTheme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ name: z.string().min(1).max(60) }).parse(input))
  .handler(async ({ data, context }): Promise<ThemeRecord> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: active } = await supabaseAdmin
      .from("themes")
      .select("tokens")
      .eq("is_active", true)
      .maybeSingle();

    const baseTokens =
      (active?.tokens as Record<string, string> | null) ?? defaultTokens();

    // Ensure unique key
    const baseKey = slugify(data.name);
    let key = baseKey;
    for (let i = 2; i < 100; i++) {
      const { data: dup } = await supabaseAdmin
        .from("themes")
        .select("key")
        .eq("key", key)
        .maybeSingle();
      if (!dup) break;
      key = `${baseKey}-${i}`;
    }

    const { data: row, error } = await supabaseAdmin
      .from("themes")
      .insert({ key, name: data.name, tokens: baseTokens, is_active: false })
      .select("key,name,tokens,is_active")
      .single();
    if (error) throw new Error(error.message);
    return {
      key: row.key,
      name: row.name,
      tokens: (row.tokens as Record<string, string> | null) ?? {},
      is_active: row.is_active,
    };
  });

export const setActiveTheme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ key: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }): Promise<{ key: string }> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("set_active_theme", { _key: data.key });
    if (error) throw new Error(error.message);
    return { key: data.key };
  });
