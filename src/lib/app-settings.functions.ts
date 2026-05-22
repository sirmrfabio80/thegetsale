import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SETTINGS_KEY = "global";

export type PrivateBetaSetting = { privateBetaEnabled: boolean };

export const getPrivateBetaEnabled = createServerFn({ method: "GET" }).handler(
  async (): Promise<PrivateBetaSetting> => {
    const { data, error } = await supabaseAdmin
      .from("app_settings")
      .select("private_beta_enabled")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();
    if (error) throw new Error(error.message);
    // Default to ON (safer) if row missing.
    return { privateBetaEnabled: data?.private_beta_enabled ?? true };
  },
);

export const setPrivateBetaEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ enabled: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<PrivateBetaSetting> => {
    const { supabase, userId } = context;
    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert(
        { key: SETTINGS_KEY, private_beta_enabled: data.enabled },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { privateBetaEnabled: data.enabled };
  });
