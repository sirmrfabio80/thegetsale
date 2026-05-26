import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BUCKET = "brand-logos";
const BATCH_SIZE = 25;

async function ensureAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

function shortHash(): string {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export type BackfillResult = {
  processed: number;
  updated: number;
  skipped: { slug: string; reason: string }[];
  errors: { slug: string; message: string }[];
  remaining: number;
  error?: "missing_token" | "invalid_token";
};

export const backfillBrandLogos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BackfillResult> => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);

    const token = process.env.LOGO_DEV_TOKEN;
    if (!token) {
      return {
        processed: 0,
        updated: 0,
        skipped: [],
        errors: [],
        remaining: 0,
        error: "missing_token",
      };
    }
    if (!token.startsWith("pk_")) {
      return {
        processed: 0,
        updated: 0,
        skipped: [],
        errors: [],
        remaining: 0,
        error: "invalid_token",
      };
    }

    // Count total remaining (before this batch).
    const { count: totalCount, error: cErr } = await supabaseAdmin
      .from("brands")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .is("logo_url", null)
      .not("website_url", "is", null);
    if (cErr) throw new Error(cErr.message);
    const totalRemaining = totalCount ?? 0;

    const { data: rows, error: bErr } = await supabaseAdmin
      .from("brands")
      .select("id, slug, website_url")
      .eq("is_active", true)
      .is("logo_url", null)
      .not("website_url", "is", null)
      .order("name", { ascending: true })
      .limit(BATCH_SIZE);
    if (bErr) throw new Error(bErr.message);

    const batch = (rows ?? []) as { id: string; slug: string; website_url: string }[];

    const skipped: { slug: string; reason: string }[] = [];
    const errors: { slug: string; message: string }[] = [];
    let updated = 0;

    for (const b of batch) {
      const domain = extractDomain(b.website_url);
      if (!domain) {
        skipped.push({ slug: b.slug, reason: "invalid_url" });
        continue;
      }
      try {
        const res = await fetch(
          `https://img.logo.dev/${encodeURIComponent(domain)}?size=256&format=png&token=${encodeURIComponent(token)}`,
        );
        if (!res.ok) {
          skipped.push({
            slug: b.slug,
            reason: res.status === 404 ? "not_found" : `http_${res.status}`,
          });
          continue;
        }
        const ct = res.headers.get("content-type") ?? "";
        if (!ct.startsWith("image/")) {
          skipped.push({ slug: b.slug, reason: "not_image" });
          continue;
        }
        const bytes = new Uint8Array(await res.arrayBuffer());
        const path = `${b.id}/${shortHash()}.png`;
        const { error: upErr } = await supabaseAdmin.storage
          .from(BUCKET)
          .upload(path, bytes, { contentType: "image/png", upsert: false });
        if (upErr) {
          errors.push({ slug: b.slug, message: upErr.message });
          continue;
        }
        const publicUrl = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        const { error: updErr } = await supabaseAdmin
          .from("brands")
          .update({ logo_url: publicUrl })
          .eq("id", b.id);
        if (updErr) {
          errors.push({ slug: b.slug, message: updErr.message });
          continue;
        }
        updated++;
      } catch (e) {
        errors.push({ slug: b.slug, message: e instanceof Error ? e.message : "fetch_failed" });
      }
    }

    return {
      processed: batch.length,
      updated,
      skipped,
      errors,
      remaining: Math.max(0, totalRemaining - updated),
    };
  });
