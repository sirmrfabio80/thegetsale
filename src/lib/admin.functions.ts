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

export type AdminStatus = { isAdmin: boolean };

export const getMyAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminStatus> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (error) throw new Error(error.message);
    return { isAdmin: !!data };
  });

export type UserWithRole = {
  id: string;
  displayName: string | null;
  isAdmin: boolean;
};

export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserWithRole[]> => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);

    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name")
        .order("display_name", { ascending: true }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (pErr) throw new Error(pErr.message);
    if (rErr) throw new Error(rErr.message);

    const adminIds = new Set(
      (roles ?? []).filter((r: any) => r.role === "admin").map((r: any) => r.user_id),
    );

    return (profiles ?? []).map((p: any) => ({
      id: p.id,
      displayName: p.display_name ?? null,
      isAdmin: adminIds.has(p.id),
    }));
  });

export const setUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), isAdmin: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);

    if (!data.isAdmin && data.userId === userId) {
      throw new Error("You can't revoke your own admin access.");
    }

    if (data.isAdmin) {
      const { error } = await supabase
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export type PredictionRunRow = {
  id: string;
  status: string;
  algorithmVersion: string;
  startedAt: string;
  finishedAt: string | null;
  brandsProcessed: number;
  predictionsCreated: number;
  predictionsUpdated: number;
};

export const listPredictionRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PredictionRunRow[]> => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);

    const { data, error } = await supabase
      .from("prediction_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);

    return (data ?? []).map((r: any) => ({
      id: r.id,
      status: r.status,
      algorithmVersion: r.algorithm_version,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      brandsProcessed: r.brands_processed,
      predictionsCreated: r.predictions_created,
      predictionsUpdated: r.predictions_updated,
    }));
  });
