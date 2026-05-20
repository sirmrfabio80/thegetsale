import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SetupDTO = {
  departments: string[];
  houses: string[];
  categories: string[];
  styles: string[];
  notifications: {
    emailSignals: boolean;
    smsDrops: boolean;
    weeklyDigest: boolean;
  };
  completedAt: string | null;
};

const SetupInput = z.object({
  departments: z.array(z.string().min(1).max(64)).max(16),
  houses: z.array(z.string().min(1).max(128)).max(200),
  categories: z.array(z.string().min(1).max(64)).max(64),
  styles: z.array(z.string().min(1).max(64)).max(16),
  notifications: z.object({
    emailSignals: z.boolean(),
    smsDrops: z.boolean(),
    weeklyDigest: z.boolean(),
  }),
  markCompleted: z.boolean().optional(),
});

type Row = {
  departments: string[] | null;
  houses: string[] | null;
  categories: string[] | null;
  styles: string[] | null;
  email_signals: boolean;
  sms_drops: boolean;
  weekly_digest: boolean;
  completed_at: string | null;
};

function toDTO(row: Row | null): SetupDTO | null {
  if (!row) return null;
  return {
    departments: row.departments ?? [],
    houses: row.houses ?? [],
    categories: row.categories ?? [],
    styles: row.styles ?? [],
    notifications: {
      emailSignals: row.email_signals,
      smsDrops: row.sms_drops,
      weeklyDigest: row.weekly_digest,
    },
    completedAt: row.completed_at,
  };
}

export const getMySetup = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SetupDTO | null> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_setup")
      .select(
        "departments, houses, categories, styles, email_signals, sms_drops, weekly_digest, completed_at",
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return toDTO(data as Row | null);
  });

export const saveMySetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SetupInput.parse(input))
  .handler(async ({ data, context }): Promise<SetupDTO> => {
    const { supabase, userId } = context;
    const now = new Date().toISOString();

    // Decide completed_at: preserve existing unless markCompleted is true.
    let completedAt: string | null = null;
    if (data.markCompleted) {
      completedAt = now;
    } else {
      const { data: existing } = await supabase
        .from("user_setup")
        .select("completed_at")
        .eq("user_id", userId)
        .maybeSingle();
      completedAt = (existing?.completed_at as string | null) ?? null;
    }

    const { data: row, error } = await supabase
      .from("user_setup")
      .upsert(
        {
          user_id: userId,
          departments: data.departments,
          houses: data.houses,
          categories: data.categories,
          styles: data.styles,
          email_signals: data.notifications.emailSignals,
          sms_drops: data.notifications.smsDrops,
          weekly_digest: data.notifications.weeklyDigest,
          completed_at: completedAt,
        },
        { onConflict: "user_id" },
      )
      .select(
        "departments, houses, categories, styles, email_signals, sms_drops, weekly_digest, completed_at",
      )
      .single();

    if (error) throw new Error(error.message);
    return toDTO(row as Row)!;
  });
