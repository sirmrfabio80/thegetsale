import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  SALE_STATUSES,
  type BrandOption,
  type SaleEventDTO,
} from "@/lib/admin-sales.functions";

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
  saleType: (typeof SALE_TYPES)[number];
  startDate: string;
  endDate: string;
  discountMin: string;
  discountMax: string;
  status: (typeof SALE_STATUSES)[number];
  adminNotes: string;
};

const empty: FormState = {
  brandId: "",
  category: "",
  saleType: "seasonal",
  startDate: "",
  endDate: "",
  discountMin: "",
  discountMax: "",
  status: "draft",
  adminNotes: "",
};

export function SaleEventDialog({ open, onOpenChange, brands, editing, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        brandId: editing.brandId,
        category: editing.category ?? "",
        saleType: (editing.saleType as any) ?? "seasonal",
        startDate: editing.startDate,
        endDate: editing.endDate ?? "",
        discountMin: editing.discountMin?.toString() ?? "",
        discountMax: editing.discountMax?.toString() ?? "",
        status: (editing.status as any) ?? "draft",
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
    onError: (e: any) => toast.error(e?.message ?? "Couldn't save"),
  });

  const validate = (next: FormState) => {
    const e: Record<string, string> = {};
    if (!next.brandId) e.brandId = "Brand is required";
    if (!next.saleType) e.saleType = "Sale type is required";
    if (!next.startDate) e.startDate = "Start date is required";
    if (next.endDate && next.endDate < next.startDate)
      e.endDate = "End date can't be before start date";
    const min = next.discountMin === "" ? null : Number(next.discountMin);
    const max = next.discountMax === "" ? null : Number(next.discountMax);
    if (min != null && (Number.isNaN(min) || min < 0 || min > 90))
      e.discountMin = "0–90";
    if (max != null && (Number.isNaN(max) || max < 0 || max > 90))
      e.discountMax = "0–90";
    if (min != null && max != null && max < min)
      e.discountMax = "Max can't be lower than min";
    return e;
  };

  const submit = (status: "draft" | "published" | "hidden") => {
    const next = { ...form, status };
    const e = validate(next);
    setErrors(e);
    if (Object.keys(e).length) return;
    saveMut.mutate(status);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-none">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {editing ? "Edit sale event" : "Add sale event"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Brand *" error={errors.brandId}>
            <Select value={form.brandId} onValueChange={(v) => setForm((f) => ({ ...f, brandId: v }))}>
              <SelectTrigger className="h-10 rounded-none">
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

          <Field label="Sale type *" error={errors.saleType}>
            <Select
              value={form.saleType}
              onValueChange={(v) => setForm((f) => ({ ...f, saleType: v as any }))}
            >
              <SelectTrigger className="h-10 rounded-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SALE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Category">
            <Input
              value={form.category}
              maxLength={80}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="h-10 rounded-none"
              placeholder="e.g. ready-to-wear"
            />
          </Field>

          <Field label="Status" error={errors.status}>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v as any }))}
            >
              <SelectTrigger className="h-10 rounded-none">
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

          <Field label="Start date *" error={errors.startDate}>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              className="h-10 rounded-none"
            />
          </Field>

          <Field label="End date" error={errors.endDate}>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              className="h-10 rounded-none"
            />
          </Field>

          <Field label="Discount min %" error={errors.discountMin}>
            <Input
              type="number"
              min={0}
              max={90}
              value={form.discountMin}
              onChange={(e) => setForm((f) => ({ ...f, discountMin: e.target.value }))}
              className="h-10 rounded-none"
            />
          </Field>

          <Field label="Discount max %" error={errors.discountMax}>
            <Input
              type="number"
              min={0}
              max={90}
              value={form.discountMax}
              onChange={(e) => setForm((f) => ({ ...f, discountMax: e.target.value }))}
              className="h-10 rounded-none"
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Admin notes">
              <Textarea
                value={form.adminNotes}
                maxLength={2000}
                onChange={(e) => setForm((f) => ({ ...f, adminNotes: e.target.value }))}
                className="min-h-[80px] rounded-none"
                placeholder="Private notes for the team."
              />
            </Field>
          </div>
        </div>

        <DialogFooter className="mt-4 flex-wrap gap-2">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildPayload(form: FormState) {
  return {
    brandId: form.brandId,
    category: form.category.trim() || null,
    saleType: form.saleType,
    startDate: form.startDate,
    endDate: form.endDate || null,
    discountMin: form.discountMin === "" ? null : Number(form.discountMin),
    discountMax: form.discountMax === "" ? null : Number(form.discountMax),
    status: form.status,
    adminNotes: form.adminNotes.trim() || null,
  };
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div>
      <label className="eyebrow mb-1 block">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
