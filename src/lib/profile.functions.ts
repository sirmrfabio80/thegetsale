import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SIGNED_URL_TTL = 60 * 60; // 1 hour

export type ProfileDTO = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarPath: string | null;
  avatarUrl: string | null;
};

async function signAvatar(
  supabase: {
    storage: {
      from: (b: string) => {
        createSignedUrl: (
          p: string,
          ttl: number,
        ) => Promise<{ data: { signedUrl: string } | null }>;
      };
    };
  },
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, SIGNED_URL_TTL);
  return data?.signedUrl ?? null;
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfileDTO> => {
    const { supabase, userId, claims } = context;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_path")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const email = (claims?.email as string | undefined) ?? null;
    const avatarPath = data?.avatar_path ?? null;
    const avatarUrl = await signAvatar(supabase, avatarPath);

    return {
      id: userId,
      email,
      displayName: data?.display_name ?? null,
      avatarPath,
      avatarUrl,
    };
  });

export const setAvatarPath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        path: z
          .string()
          .min(1)
          .max(255)
          .regex(/^[a-f0-9-]+\/profile\.(png|jpg|jpeg|webp)$/i),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<ProfileDTO> => {
    const { supabase, userId, claims } = context;

    if (!data.path.startsWith(`${userId}/`)) {
      throw new Error("Forbidden");
    }

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, avatar_path: data.path }, { onConflict: "id" });
    if (error) throw new Error(error.message);

    const avatarUrl = await signAvatar(supabase, data.path);
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();

    return {
      id: userId,
      email: (claims?.email as string | undefined) ?? null,
      displayName: profile?.display_name ?? null,
      avatarPath: data.path,
      avatarUrl,
    };
  });

export const removeAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfileDTO> => {
    const { supabase, userId, claims } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_path")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.avatar_path) {
      await supabase.storage.from("avatars").remove([profile.avatar_path]);
    }

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, avatar_path: null }, { onConflict: "id" });
    if (error) throw new Error(error.message);

    return {
      id: userId,
      email: (claims?.email as string | undefined) ?? null,
      displayName: profile?.display_name ?? null,
      avatarPath: null,
      avatarUrl: null,
    };
  });

export const updateDisplayName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        displayName: z
          .string()
          .trim()
          .min(1, "Name can't be empty")
          .max(80, "Keep it under 80 characters"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<ProfileDTO> => {
    const { supabase, userId, claims } = context;

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, display_name: data.displayName }, { onConflict: "id" });
    if (error) throw new Error(error.message);

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_path")
      .eq("id", userId)
      .maybeSingle();

    const avatarPath = profile?.avatar_path ?? null;
    const avatarUrl = await signAvatar(supabase, avatarPath);

    return {
      id: userId,
      email: (claims?.email as string | undefined) ?? null,
      displayName: profile?.display_name ?? data.displayName,
      avatarPath,
      avatarUrl,
    };
  });
