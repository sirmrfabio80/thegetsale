import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { Loader2, Trash2, UploadCloud } from "lucide-react";
import {
  listHeroMediaFiles,
  deleteHeroMediaFile,
  type HeroMediaFile,
} from "@/lib/marketing-media.functions";
import { HERO_MEDIA_QUERY_KEY, MARKETING_MEDIA_BUCKET } from "@/lib/marketing-media";

type Slot = {
  key: "webm" | "mp4" | "poster";
  path: HeroMediaFile["path"];
  label: string;
  description: string;
  accept: string;
  maxMB: number;
};

const SLOTS: Slot[] = [
  {
    key: "webm",
    path: "hero-summer.webm",
    label: "Video · WebM",
    description: "Preferred modern format. Muted, looping, ~5–15s.",
    accept: "video/webm",
    maxMB: 40,
  },
  {
    key: "mp4",
    path: "hero-summer.mp4",
    label: "Video · MP4 (fallback)",
    description: "H.264 fallback for Safari and older browsers.",
    accept: "video/mp4",
    maxMB: 40,
  },
  {
    key: "poster",
    path: "hero-summer-poster.jpg",
    label: "Poster image",
    description: "Static frame shown while the video loads, and to reduced-motion visitors.",
    accept: "image/jpeg,image/png,image/webp",
    maxMB: 4,
  },
];

function formatSize(bytes: number | null) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null) {
  if (!iso) return "Not uploaded";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function MediaTab() {
  const listFn = useServerFn(listHeroMediaFiles);
  const deleteFn = useServerFn(deleteHeroMediaFile);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin", "marketing-media", "hero-summer"],
    queryFn: () => listFn(),
  });

  const byPath = new Map((q.data ?? []).map((f) => [f.path, f]));

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Marketing media</p>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Upload the looping hero video shown on the marketing page and dashboard. Replace or
          remove files as the campaign changes.
        </p>
      </div>

      <div className="grid gap-4">
        {SLOTS.map((slot) => (
          <SlotRow
            key={slot.key}
            slot={slot}
            file={byPath.get(slot.path) ?? null}
            loading={q.isLoading}
            onChanged={() => {
              qc.invalidateQueries({ queryKey: ["admin", "marketing-media", "hero-summer"] });
              qc.invalidateQueries({ queryKey: HERO_MEDIA_QUERY_KEY });
            }}
            onDelete={async () => {
              try {
                await deleteFn({ data: { path: slot.path } });
                toast.success(`${slot.label} removed.`);
                qc.invalidateQueries({ queryKey: ["admin", "marketing-media", "hero-summer"] });
                qc.invalidateQueries({ queryKey: HERO_MEDIA_QUERY_KEY });
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Couldn't delete file.");
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

function SlotRow({
  slot,
  file,
  loading,
  onChanged,
  onDelete,
}: {
  slot: Slot;
  file: HeroMediaFile | null;
  loading: boolean;
  onChanged: () => void;
  onDelete: () => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > slot.maxMB * 1024 * 1024) {
        throw new Error(`File too large. Max ${slot.maxMB} MB.`);
      }
      setUploading(true);
      setProgress(0);
      const { error } = await supabase.storage
        .from(MARKETING_MEDIA_BUCKET)
        .upload(slot.path, file, {
          upsert: true,
          contentType: file.type || undefined,
          cacheControl: "3600",
        });
      if (error) throw new Error(error.message);
      setProgress(100);
    },
    onSuccess: () => {
      toast.success(`${slot.label} uploaded.`);
      onChanged();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    },
    onSettled: () => {
      setUploading(false);
      setTimeout(() => setProgress(null), 800);
      if (inputRef.current) inputRef.current.value = "";
    },
  });

  const uploaded = Boolean(file?.updatedAt);

  return (
    <div className="border border-border p-4 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">{slot.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{slot.description}</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground md:grid-cols-3">
            <div>
              <dt className="opacity-70">Status</dt>
              <dd className="mt-0.5 normal-case tracking-normal text-foreground">
                {loading ? "Checking…" : uploaded ? "Uploaded" : "Not uploaded"}
              </dd>
            </div>
            <div>
              <dt className="opacity-70">Size</dt>
              <dd className="mt-0.5 normal-case tracking-normal text-foreground">
                {formatSize(file?.sizeBytes ?? null)}
              </dd>
            </div>
            <div className="col-span-2 md:col-span-1">
              <dt className="opacity-70">Updated</dt>
              <dd className="mt-0.5 normal-case tracking-normal text-foreground">
                {formatDate(file?.updatedAt ?? null)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-shrink-0 flex-col items-stretch gap-2 md:items-end">
          <input
            ref={inputRef}
            type="file"
            accept={slot.accept}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload.mutate(f);
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-10 items-center justify-center gap-2 border border-foreground px-4 text-[11px] uppercase tracking-[0.18em] hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            {uploaded ? "Replace" : "Upload"}
          </button>
          {uploaded && (
            <button
              type="button"
              onClick={onDelete}
              disabled={uploading}
              className="inline-flex h-9 items-center justify-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          )}
        </div>
      </div>

      {progress !== null && (
        <div className="mt-3 h-0.5 w-full overflow-hidden bg-border">
          <div
            className="h-full bg-foreground transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
