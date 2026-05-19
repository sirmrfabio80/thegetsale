import { createFileRoute, redirect } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageLayout, SectionRule } from "@/components/PageLayout";
import { AvatarBlock } from "@/components/profile/AvatarBlock";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyProfile,
  removeAvatar,
  setAvatarPath,
  type ProfileDTO,
} from "@/lib/profile.functions";
import { useProfile } from "@/hooks/use-profile";

const ALLOWED = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export const Route = createFileRoute("/_authenticated/profile")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Your profile — The Get" },
      { name: "description", content: "Manage your account on The Get." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const profileQuery = useProfile();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const setPath = useServerFn(setAvatarPath);
  const remove = useServerFn(removeAvatar);
  const refetchProfile = useServerFn(getMyProfile);

  const writeCache = (next: ProfileDTO) => {
    queryClient.setQueryData(["me", "profile", next.id], next);
  };

  const removeMutation = useMutation({
    mutationFn: () => remove(),
    onSuccess: (next) => {
      writeCache(next);
      toast.success("Photo removed");
    },
    onError: () => setError("Couldn't remove the photo. Try again."),
  });

  const onPick = () => {
    setError(null);
    fileInputRef.current?.click();
  };

  const onFile = async (file: File) => {
    setError(null);

    if (!ALLOWED.includes(file.type)) {
      setError("Use a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image must be under 5 MB.");
      return;
    }

    const profile = profileQuery.data;
    if (!profile) return;

    const ext =
      file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${profile.id}/profile.${ext}`;

    setUploading(true);
    try {
      // Remove any previously stored avatar at a different extension so the
      // folder stays at exactly one file.
      if (profile.avatarPath && profile.avatarPath !== path) {
        await supabase.storage.from("avatars").remove([profile.avatarPath]);
      }
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "0" });
      if (uploadError) throw uploadError;

      const next = await setPath({ data: { path } });
      writeCache(next);
      toast.success("Photo updated");
    } catch (e) {
      console.error(e);
      setError("Upload failed. Please try a different image.");
      // Refresh to make sure UI matches server state.
      try {
        const fresh = await refetchProfile();
        writeCache(fresh);
      } catch {
        /* ignore */
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const profile = profileQuery.data;
  const isLoading = profileQuery.isLoading;
  const fallback = profile?.displayName ?? profile?.email ?? "?";
  const hasAvatar = !!profile?.avatarUrl;

  return (
    <PageLayout>
      <section className="pt-16 md:pt-24">
        <p className="eyebrow">Account</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">
          Your profile.
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          A quiet face for the houses you follow. Used only inside The Get.
        </p>
      </section>

      <SectionRule />

      <section className="border border-border bg-card p-6 md:p-10">
        {isLoading || !profile ? (
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 animate-pulse border border-border bg-muted" />
            <div className="space-y-3">
              <div className="h-3 w-40 animate-pulse bg-muted" />
              <div className="h-3 w-56 animate-pulse bg-muted" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-10">
            <AvatarBlock url={profile.avatarUrl} fallback={fallback} />

            <div className="flex-1">
              <p className="eyebrow">Signed in as</p>
              <p className="mt-2 font-serif text-2xl text-foreground">
                {profile.displayName ?? "Unnamed"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{profile.email}</p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  onClick={onPick}
                  disabled={uploading || removeMutation.isPending}
                  className="h-11 rounded-none px-5 text-[11px] uppercase tracking-[0.18em]"
                >
                  {uploading
                    ? "Uploading…"
                    : hasAvatar
                    ? "Replace photo"
                    : "Upload photo"}
                </Button>
                {hasAvatar && (
                  <button
                    type="button"
                    onClick={() => removeMutation.mutate()}
                    disabled={uploading || removeMutation.isPending}
                    className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
                  >
                    {removeMutation.isPending ? "Removing…" : "Remove photo"}
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFile(f);
                }}
              />

              <p className="mt-4 text-xs text-muted-foreground">
                JPG, PNG, or WebP · up to 5 MB · square images look best.
              </p>
              {error && (
                <p className="mt-3 text-xs text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>
          </div>
        )}
      </section>
    </PageLayout>
  );
}
