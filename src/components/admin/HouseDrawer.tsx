import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/lib/toast";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createHouse,
  updateHouse,
  setBrandLogoUrl,
  removeBrandLogo,
  HOUSE_GROUPS,
  type HouseDTO,
} from "@/lib/admin-houses.functions";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: HouseDTO | null;
  onSaved: () => void;
};

type FormState = {
  name: string;
  slug: string;
  houseGroup: string;
  country: string;
  websiteUrl: string;
  description: string;
  isActive: boolean;
};

type FieldName = keyof FormState;

const empty: FormState = {
  name: "",
  slug: "",
  houseGroup: "",
  country: "",
  websiteUrl: "",
  description: "",
  isActive: true,
};

const NONE = "__none__";
const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Keep under 120 characters"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(80, "Keep under 80 characters")
    .regex(slugRe, "Use lowercase letters, numbers and hyphens only"),
  houseGroup: z.string().max(80),
  country: z.string().max(80),
  websiteUrl: z
    .string()
    .max(300)
    .refine((v) => v === "" || /^https?:\/\/\S+\.\S+/.test(v), {
      message: "Must be a valid URL (https://…)",
    }),
  description: z.string().max(2000, "Keep under 2000 characters"),
  isActive: z.boolean(),
});

export function HouseDrawer({ open, onOpenChange, editing, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [slugDirty, setSlugDirty] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name,
        slug: editing.slug,
        houseGroup: editing.houseGroup ?? "",
        country: editing.country ?? "",
        websiteUrl: editing.websiteUrl ?? "",
        description: editing.description ?? "",
        isActive: editing.isActive,
      });
      setSlugDirty(true);
    } else {
      setForm(empty);
      setSlugDirty(false);
    }
    setErrors({});
  }, [open, editing]);

  const createFn = useServerFn(createHouse);
  const updateFn = useServerFn(updateHouse);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        houseGroup: form.houseGroup.trim() || null,
        country: form.country.trim() || null,
        websiteUrl: form.websiteUrl.trim() || null,
        description: form.description.trim() || null,
        isActive: form.isActive,
      };
      if (editing) {
        return updateFn({ data: { id: editing.id, ...payload } });
      }
      return createFn({ data: payload });
    },
    onSuccess: () => {
      toast.success(editing ? "House updated" : "House created");
      onSaved();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Couldn't save house"),
  });

  const setField = <K extends FieldName>(name: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const { [name]: _omit, ...rest } = prev;
      return rest;
    });
  };

  const handleNameChange = (value: string) => {
    setForm((f) => {
      const next = { ...f, name: value };
      if (!slugDirty) next.slug = slugify(value);
      return next;
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next.name;
      if (!slugDirty) delete next.slug;
      return next;
    });
  };

  const handleSlugChange = (value: string) => {
    setSlugDirty(true);
    setField("slug", value);
  };

  const validate = (next: FormState) => {
    const result = formSchema.safeParse(next);
    if (result.success) return {};
    const out: Partial<Record<FieldName, string>> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as FieldName | undefined;
      if (key && !out[key]) out[key] = issue.message;
    }
    return out;
  };

  const submit = () => {
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error("Please fix the highlighted fields");
      bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    saveMut.mutate();
  };

  const errorCount = Object.keys(errors).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 rounded-none p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b border-border p-6 text-left">
          <p className="eyebrow text-muted-foreground">{editing ? "Edit" : "New"} · House</p>
          <SheetTitle className="font-serif text-2xl">
            {editing ? "Edit house" : "Add house"}
          </SheetTitle>
          <SheetDescription>
            Create a house record used for signals, sale events and personalised recommendations.
          </SheetDescription>
        </SheetHeader>

        <div ref={bodyRef} className="flex-1 overflow-y-auto p-6">
          {errorCount > 0 && (
            <div
              role="alert"
              className="mb-4 border border-destructive/60 bg-destructive/5 px-3 py-2 text-xs text-destructive"
            >
              {errorCount === 1
                ? "1 field needs attention before saving."
                : `${errorCount} fields need attention before saving.`}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field id="name" label="Name" required error={errors.name}>
              <Input
                id="name"
                value={form.name}
                maxLength={120}
                aria-invalid={!!errors.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="h-10 rounded-none"
                placeholder="e.g. The Row"
              />
            </Field>

            <Field
              id="slug"
              label="Slug"
              required
              error={errors.slug}
              hint="Used internally for routing and matching."
            >
              <Input
                id="slug"
                value={form.slug}
                maxLength={80}
                aria-invalid={!!errors.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="h-10 rounded-none"
                placeholder="the-row"
              />
            </Field>

            <Field id="houseGroup" label="House group" error={errors.houseGroup}>
              <Select
                value={form.houseGroup === "" ? NONE : form.houseGroup}
                onValueChange={(v) => setField("houseGroup", v === NONE ? "" : v)}
              >
                <SelectTrigger
                  id="houseGroup"
                  aria-invalid={!!errors.houseGroup}
                  className="h-10 rounded-none"
                >
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {HOUSE_GROUPS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field id="country" label="Country" error={errors.country}>
              <Input
                id="country"
                value={form.country}
                maxLength={80}
                aria-invalid={!!errors.country}
                onChange={(e) => setField("country", e.target.value)}
                className="h-10 rounded-none"
                placeholder="e.g. France"
              />
            </Field>

            <div className="md:col-span-2">
              <Field id="websiteUrl" label="Website URL" error={errors.websiteUrl}>
                <Input
                  id="websiteUrl"
                  type="url"
                  value={form.websiteUrl}
                  maxLength={300}
                  aria-invalid={!!errors.websiteUrl}
                  onChange={(e) => setField("websiteUrl", e.target.value)}
                  className="h-10 rounded-none"
                  placeholder="https://example.com"
                />
              </Field>
            </div>

            <div className="md:col-span-2">
              <Field id="description" label="Description" error={errors.description}>
                <Textarea
                  id="description"
                  value={form.description}
                  maxLength={2000}
                  aria-invalid={!!errors.description}
                  onChange={(e) => setField("description", e.target.value)}
                  className="min-h-[100px] rounded-none"
                  placeholder="Short editorial note used in admin context."
                />
              </Field>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center justify-between border border-border px-4 py-3">
                <span>
                  <span className="eyebrow block">Active</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Inactive houses are hidden from new sale events and the dashboard.
                  </span>
                </span>
                <Switch checked={form.isActive} onCheckedChange={(v) => setField("isActive", v)} />
              </label>
            </div>

            <div className="md:col-span-2">
              <LogoField
                brandId={editing?.id ?? null}
                name={form.name || editing?.name || ""}
                currentLogoUrl={editing?.logoUrl ?? null}
                onChanged={onSaved}
              />
            </div>
          </div>
        </div>

        <SheetFooter className="flex-row flex-wrap justify-end gap-2 border-t border-border p-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saveMut.isPending}
            className="h-10 rounded-none px-4 text-[11px] uppercase tracking-[0.18em]"
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={saveMut.isPending}
            className="h-10 rounded-none px-4 text-[11px] uppercase tracking-[0.18em]"
          >
            {saveMut.isPending ? "Saving…" : "Save house"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  id,
  label,
  children,
  error,
  required,
  hint,
}: {
  id?: string;
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="eyebrow mb-1 block">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={id ? `${id}-error` : undefined} className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

const MAX_BYTES = 1024 * 1024; // 1 MB
const MAX_DIM = 1024;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

function shortHash(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  if (file.type === "image/svg+xml") return Promise.resolve(null); // skip for SVG
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

function LogoField({
  brandId,
  name,
  currentLogoUrl,
  onChanged,
}: {
  brandId: string | null;
  name: string;
  currentLogoUrl: string | null;
  onChanged: () => void;
}) {
  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const setLogoFn = useServerFn(setBrandLogoUrl);
  const removeLogoFn = useServerFn(removeBrandLogo);

  useEffect(() => {
    setLogoUrl(currentLogoUrl);
  }, [currentLogoUrl, brandId]);

  const disabled = !brandId;

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !brandId) return;

    if (!ALLOWED_MIME.has(file.type)) {
      toast.error("Use a PNG, JPG, WebP or SVG file");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Logo must be 1 MB or smaller");
      return;
    }
    const dims = await readImageDimensions(file);
    if (dims && (dims.width > MAX_DIM || dims.height > MAX_DIM)) {
      toast.error(`Logo must be ${MAX_DIM}×${MAX_DIM} or smaller`);
      return;
    }

    setBusy(true);
    try {
      const ext = MIME_EXT[file.type] ?? "png";
      const path = `${brandId}/${shortHash()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("brand-logos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw new Error(upErr.message);
      const publicUrl = supabase.storage.from("brand-logos").getPublicUrl(path).data.publicUrl;
      await setLogoFn({ data: { brandId, logoUrl: publicUrl } });
      setLogoUrl(publicUrl);
      toast.success("Logo updated");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't upload logo");
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async () => {
    if (!brandId) return;
    setBusy(true);
    try {
      await removeLogoFn({ data: { brandId } });
      setLogoUrl(null);
      toast.success("Logo removed");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove logo");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <span className="eyebrow mb-1 block">Logo</span>
      <div className="flex items-center gap-4 border border-border p-3">
        <BrandLogo name={name || "—"} logoUrl={logoUrl} width={96} height={64} />
        <div className="flex-1">
          {disabled ? (
            <p className="text-xs text-muted-foreground">
              Save the house first, then add a logo.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WebP or SVG · up to 1 MB · max 1024×1024.
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={onPick}
              disabled={disabled || busy}
            />
            <Button
              type="button"
              variant="outline"
              disabled={disabled || busy}
              onClick={() => inputRef.current?.click()}
              className="h-9 rounded-none px-3 text-[11px] uppercase tracking-[0.18em]"
            >
              {busy ? "Working…" : logoUrl ? "Replace" : "Choose file"}
            </Button>
            {logoUrl && (
              <Button
                type="button"
                variant="ghost"
                disabled={disabled || busy}
                onClick={onRemove}
                className="h-9 rounded-none px-3 text-[11px] uppercase tracking-[0.18em]"
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
