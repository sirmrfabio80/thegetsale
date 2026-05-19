import { createFileRoute, redirect } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageLayout, SectionRule } from "@/components/PageLayout";
import { AvatarBlock } from "@/components/profile/AvatarBlock";
import { AvatarCropModal } from "@/components/profile/AvatarCropModal";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyProfile,
  removeAvatar,
  setAvatarPath,
  updateDisplayName,
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

type UploadError = {
  message: string;
  retry?: () => void;
};

function ProfilePage() {
  const profileQuery = useProfile();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<UploadError | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const setPath = useServerFn(setAvatarPath);
  const remove = useServerFn(removeAvatar);
  const updateName = useServerFn(updateDisplayName);
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
    onError: () =>
      setError({
        message: "Couldn't remove the photo. Check your connection and try again.",
        retry: () => removeMutation.mutate(),
      }),
  });

  // Display name edit state
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  const nameMutation = useMutation({
    mutationFn: (displayName: string) => updateName({ data: { displayName } }),
    onSuccess: (next) => {
      writeCache(next);
      setEditingName(false);
      toast.success("Name updated");
    },
    onError: (e: unknown) =>
      setNameError(e instanceof Error ? e.message : "Couldn't save your name."),
  });

  const onPick = () => {
    setError(null);
    fileInputRef.current?.click();
  };

  const validateAndStage = (file: File) => {
    setError(null);
    if (!ALLOWED.includes(file.type)) {
      setError({ message: "Use a JPG, PNG, or WebP image." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setError({ message: "That image is over 5 MB. Try a smaller one." });
      return;
    }
    setPendingFile(file);
  };

  const uploadBlob = async (blob: Blob, mime: string) => {
    const profile = profileQuery.data;
    if (!profile) return;
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const path = `${profile.id}/profile.${ext}`;
    setUploading(true);
    setError(null);
    try {
      if (profile.avatarPath && profile.avatarPath !== path) {
        await supabase.storage.from("avatars").remove([profile.avatarPath]);
      }
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: mime, cacheControl: "0" });
      if (uploadError) throw uploadError;

      const next = await setPath({ data: { path } });
      writeCache(next);
      setPendingFile(null);
      toast.success("Photo updated");
    } catch (e) {
      console.error(e);
      const msg =
        e instanceof Error && /quota|policy|permission|denied/i.test(e.message)
          ? "Storage rejected the upload. Please sign out and back in, then try again."
          : "Upload failed. Check your connection or try a different image.";
      setError({ message: msg, retry: () => void uploadBlob(blob, mime) });
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
          <ProfileSkeleton />
        ) : (
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-10">
            <AvatarBlock
              url={profile.avatarUrl}
              fallback={fallback}
              loading={uploading}
            />

            <div className="flex-1">
              <p className="eyebrow">Signed in as</p>

              {editingName ? (
                <div className="mt-2 max-w-sm">
                  <input
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => {
                      setNameDraft(e.target.value);
                      if (nameError) setNameError(null);
                    }}
                    maxLength={80}
                    placeholder="Your name"
                    className="w-full border border-foreground bg-background px-3 py-2 font-serif text-2xl text-foreground focus:outline-none"
                  />
                  <div className="mt-3 flex items-center gap-3">
                    <Button
                      onClick={() => {
                        const trimmed = nameDraft.trim();
                        if (!trimmed) {
                          setNameError("Name can't be empty.");
                          return;
                        }
                        nameMutation.mutate(trimmed);
                      }}
                      disabled={nameMutation.isPending}
                      className="h-10 rounded-none px-4 text-[11px] uppercase tracking-[0.18em]"
                    >
                      {nameMutation.isPending ? "Saving…" : "Save"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingName(false);
                        setNameError(null);
                      }}
                      disabled={nameMutation.isPending}
                      className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                  {nameError && (
                    <p className="mt-2 text-xs text-destructive" role="alert">
                      {nameError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-2 flex items-baseline gap-3">
                  <p className="font-serif text-2xl text-foreground">
                    {profile.displayName ?? "Unnamed"}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(profile.displayName ?? "");
                      setEditingName(true);
                    }}
                    className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Edit
                  </button>
                </div>
              )}
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
                  if (f) validateAndStage(f);
                }}
              />

              <p className="mt-4 text-xs text-muted-foreground">
                JPG, PNG, or WebP · up to 5 MB · you'll get to crop after picking.
              </p>
              {error && (
                <div
                  className="mt-3 flex flex-wrap items-center gap-3 border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                  role="alert"
                >
                  <span>{error.message}</span>
                  {error.retry && (
                    <button
                      type="button"
                      onClick={() => error.retry?.()}
                      className="uppercase tracking-[0.18em] underline-offset-4 hover:underline"
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {pendingFile && (
        <AvatarCropModal
          file={pendingFile}
          busy={uploading}
          onCancel={() => {
            if (uploading) return;
            setPendingFile(null);
          }}
          onConfirm={(blob) => void uploadBlob(blob, pendingFile.type)}
        />
      )}
    </PageLayout>
  );
}

function Shimmer({ className }: { className?: string }) {
  return (
    <span
      className={`relative inline-block overflow-hidden bg-muted ${className ?? ""}`}
      aria-hidden="true"
    >
      <span
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, color-mix(in oklab, currentColor 8%, transparent) 50%, transparent 100%)",
          animation: "theget-shimmer 1.6s linear infinite",
        }}
      />
    </span>
  );
}

function ProfileSkeleton() {
  return (
    <div
      className="flex flex-col gap-8 md:flex-row md:items-start md:gap-10"
      aria-busy="true"
      aria-live="polite"
    >
      <AvatarBlock url={null} fallback="?" loading />
      <div className="flex-1 space-y-4">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="h-8 w-64" />
        <Shimmer className="h-3 w-48" />
        <div className="pt-4">
          <Shimmer className="h-11 w-40" />
        </div>
      </div>
    </div>
  );
}
