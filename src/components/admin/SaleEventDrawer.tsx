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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createSaleEvent,
  updateSaleEvent,
  SALE_TYPES,
  SALE_TYPE_LABELS,
  SALE_STATUSES,
  SOURCE_TYPES,
  SOURCE_TYPE_LABELS,
  type BrandOption,
  type SaleEventDTO,
} from "@/lib/admin-sales.functions";
import { MARKETS } from "@/lib/markets";

const EVIDENCE_TEMPLATE = `Evidence
- Source:
- URL:
- Archived URL:
- Observed date:
- Sale copy:
- Discount range:
- Date confidence:
- Notes:

Confidence: low | medium | high
`;


type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brands: BrandOption[];
  editing: SaleEventDTO | null;
  onSaved: () => void;
};

type FormState = {
  brandId: string;
  category: string;
  countryCode: string; // "" = Global
  saleType: (typeof SALE_TYPES)[number];
  sourceType: (typeof SOURCE_TYPES)[number];
  startDate: string;
  endDate: string;
  discountMin: string;
  discountMax: string;
  status: (typeof SALE_STATUSES)[number];
  adminNotes: string;
};

type FieldName = keyof FormState;

const empty: FormState = {
  brandId: "",
  category: "",
  countryCode: "",
  saleType: "summer_sale",
  sourceType: "admin_confirmed",
  startDate: "",
  endDate: "",
  discountMin: "",
  discountMax: "",
  status: "draft",
  adminNotes: "",
};

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const discountField = z
  .string()
  .refine((v) => v === "" || /^\d+$/.test(v), { message: "Whole number 0–100" })
  .refine(
    (v) => {
      if (v === "") return true;
      const n = Number(v);
      return n >= 0 && n <= 100;
    },
    { message: "Must be between 0 and 100" },
  );


const saleFormSchema = z
  .object({
    brandId: z.string().uuid({ message: "Brand is required" }),
    saleType: z.enum(SALE_TYPES as unknown as [string, ...string[]]),
    sourceType: z.enum(SOURCE_TYPES as unknown as [string, ...string[]]),
    status: z.enum(SALE_STATUSES as unknown as [string, ...string[]]),
    category: z.string().max(80, "Keep under 80 characters"),
    startDate: z.string().regex(dateRe, "Start date is required"),
    endDate: z.string().refine((v) => v === "" || dateRe.test(v), { message: "Invalid date" }),
    discountMin: discountField,
    discountMax: discountField,
    adminNotes: z.string().max(2000, "Keep under 2000 characters"),
  })

  .superRefine((val, ctx) => {
    if (val.endDate && val.startDate && val.endDate < val.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date can't be before start date",
      });
    }
    if (val.discountMin !== "" && val.discountMax !== "") {
      if (Number(val.discountMax) < Number(val.discountMin)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["discountMax"],
          message: "Max can't be lower than min",
        });
      }
    }
  });

export function SaleEventDrawer({ open, onOpenChange, brands, editing, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        brandId: editing.brandId,
        category: editing.category ?? "",
        countryCode: editing.countryCode ?? "",
        saleType: (editing.saleType as FormState["saleType"]) ?? "summer_sale",
        sourceType: (editing.sourceType as FormState["sourceType"]) ?? "admin_confirmed",
        startDate: editing.startDate,
        endDate: editing.endDate ?? "",
        discountMin: editing.discountMin?.toString() ?? "",
        discountMax: editing.discountMax?.toString() ?? "",
        status: (editing.status as FormState["status"]) ?? "draft",
        adminNotes: editing.adminNotes ?? "",
      });

    } else {
      setForm(empty);
    }
    setErrors({});
  }, [open, editing]);

  const createFn = useServerFn(createSaleEvent);
  const updateFn = useServerFn(updateSaleEvent);

  const saveMut = useMutation({
    mutationFn: async (status: "draft" | "published" | "hidden") => {
      const payload = buildPayload({ ...form, status });
      if (editing) {
        return updateFn({ data: { id: editing.id, ...payload } });
      }
      return createFn({ data: payload });
    },
    onSuccess: () => {
      toast.success(editing ? "Sale event updated" : "Sale event created");
      onSaved();
    },
    onError: (e: unknown) => toast.error(extractServerError(e)),
  });

  const validate = (next: FormState) => {
    const result = saleFormSchema.safeParse(next);
    if (result.success) return {};
    const out: Partial<Record<FieldName, string>> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as FieldName | undefined;
      if (key && !out[key]) out[key] = issue.message;
    }
    return out;
  };

  const setField = <K extends FieldName>(name: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const { [name]: _omit, ...rest } = prev;
      return rest;
    });
  };

  const submit = (status: "draft" | "published" | "hidden") => {
    const next = { ...form, status };
    const e = validate(next);
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error("Please fix the highlighted fields");
      bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    saveMut.mutate(status);
  };

  const errorCount = Object.keys(errors).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 rounded-none p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b border-border p-6 text-left">
          <p className="eyebrow text-muted-foreground">
            {editing ? "Edit" : "New"} · {form.status}
          </p>
          <SheetTitle className="font-serif text-2xl">
            {editing ? "Edit sale event" : "Add sale event"}
          </SheetTitle>
          <SheetDescription>
            Set the brand, dates and discount range. Save as draft to keep it private, or publish to
            make it visible.
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
            <Field id="brandId" label="Brand" required error={errors.brandId}>
              <Select value={form.brandId} onValueChange={(v) => setField("brandId", v)}>
                <SelectTrigger
                  id="brandId"
                  aria-invalid={!!errors.brandId}
                  className="h-10 rounded-none"
                >
                  <SelectValue placeholder="Select a brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field id="countryCode" label="Market" error={errors.countryCode}>
              <Select
                value={form.countryCode === "" ? "__global__" : form.countryCode}
                onValueChange={(v) => setField("countryCode", v === "__global__" ? "" : v)}
              >
                <SelectTrigger
                  id="countryCode"
                  aria-invalid={!!errors.countryCode}
                  className="h-10 rounded-none"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__global__">Global</SelectItem>
                  {MARKETS.map((m) => (
                    <SelectItem key={m.code} value={m.code}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>


            <Field id="saleType" label="Sale type" required error={errors.saleType}>
              <Select
                value={form.saleType}
                onValueChange={(v) => setField("saleType", v as FormState["saleType"])}
              >
                <SelectTrigger
                  id="saleType"
                  aria-invalid={!!errors.saleType}
                  className="h-10 rounded-none"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SALE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {SALE_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field id="sourceType" label="Source" error={errors.sourceType}>
              <Select
                value={form.sourceType}
                onValueChange={(v) => setField("sourceType", v as FormState["sourceType"])}
              >
                <SelectTrigger
                  id="sourceType"
                  aria-invalid={!!errors.sourceType}
                  className="h-10 rounded-none"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SOURCE_TYPE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>


            <Field id="category" label="Category" error={errors.category}>
              <Input
                id="category"
                value={form.category}
                maxLength={80}
                aria-invalid={!!errors.category}
                onChange={(e) => setField("category", e.target.value)}
                className="h-10 rounded-none"
                placeholder="e.g. ready-to-wear"
              />
            </Field>

            <Field id="status" label="Status" error={errors.status}>
              <Select
                value={form.status}
                onValueChange={(v) => setField("status", v as FormState["status"])}
              >
                <SelectTrigger
                  id="status"
                  aria-invalid={!!errors.status}
                  className="h-10 rounded-none"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SALE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field id="startDate" label="Start date" required error={errors.startDate}>
              <Input
                id="startDate"
                type="date"
                value={form.startDate}
                aria-invalid={!!errors.startDate}
                onChange={(e) => setField("startDate", e.target.value)}
                className="h-10 rounded-none"
              />
            </Field>

            <Field id="endDate" label="End date" error={errors.endDate}>
              <Input
                id="endDate"
                type="date"
                value={form.endDate}
                aria-invalid={!!errors.endDate}
                onChange={(e) => setField("endDate", e.target.value)}
                className="h-10 rounded-none"
              />
            </Field>

            <Field id="discountMin" label="Discount min %" error={errors.discountMin}>
              <Input
                id="discountMin"
                type="number"
                min={0}
                max={100}
                value={form.discountMin}
                aria-invalid={!!errors.discountMin}
                onChange={(e) => setField("discountMin", e.target.value)}
                className="h-10 rounded-none"
              />
            </Field>

            <Field id="discountMax" label="Discount max %" error={errors.discountMax}>
              <Input
                id="discountMax"
                type="number"
                min={0}
                max={100}
                value={form.discountMax}
                aria-invalid={!!errors.discountMax}
                onChange={(e) => setField("discountMax", e.target.value)}
                className="h-10 rounded-none"
              />
            </Field>

            <div className="md:col-span-2">
              <Field id="adminNotes" label="Admin notes" error={errors.adminNotes}>
                <div className="mb-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setField(
                        "adminNotes",
                        form.adminNotes
                          ? `${form.adminNotes.replace(/\s*$/, "")}\n\n${EVIDENCE_TEMPLATE}`
                          : EVIDENCE_TEMPLATE,
                      )
                    }
                    className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
                  >
                    Insert evidence template
                  </button>
                </div>
                <Textarea
                  id="adminNotes"
                  value={form.adminNotes}
                  maxLength={2000}
                  aria-invalid={!!errors.adminNotes}
                  onChange={(e) => setField("adminNotes", e.target.value)}
                  className="min-h-[160px] rounded-none font-mono text-xs"
                  placeholder="Private notes for the team. Use the evidence template above for sources."
                />
              </Field>
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
            variant="outline"
            onClick={() => submit("draft")}
            disabled={saveMut.isPending}
            className="h-10 rounded-none px-4 text-[11px] uppercase tracking-[0.18em]"
          >
            {saveMut.isPending ? "Saving…" : "Save as draft"}
          </Button>
          <Button
            onClick={() => submit("published")}
            disabled={saveMut.isPending}
            className="h-10 rounded-none px-4 text-[11px] uppercase tracking-[0.18em]"
          >
            {saveMut.isPending ? "Publishing…" : "Publish"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function buildPayload(form: FormState) {
  return {
    brandId: form.brandId,
    category: form.category.trim() || null,
    countryCode: form.countryCode === "" ? null : form.countryCode,
    saleType: form.saleType,
    startDate: form.startDate,
    endDate: form.endDate || null,
    discountMin: form.discountMin === "" ? null : Number(form.discountMin),
    discountMax: form.discountMax === "" ? null : Number(form.discountMax),
    status: form.status,
    adminNotes: form.adminNotes.trim() || null,
  };
}

function extractServerError(e: unknown): string {
  const fallback = "Couldn't save sale event.";
  if (!(e instanceof Error)) return fallback;
  const msg = e.message?.trim();
  if (!msg) return fallback;
  // Server may rethrow zod issues as a JSON string — surface the first message.
  if (msg.startsWith("[") || msg.startsWith("{")) {
    try {
      const parsed = JSON.parse(msg);
      const first = Array.isArray(parsed) ? parsed[0] : parsed;
      if (first && typeof first.message === "string") return first.message;
    } catch {
      /* ignore */
    }
    return fallback;
  }
  return msg;
}

function Field({
  id,
  label,
  children,
  error,
  required,
}: {
  id?: string;
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="eyebrow mb-1 block">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </label>
      {children}
      {error && (
        <p id={id ? `${id}-error` : undefined} className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
