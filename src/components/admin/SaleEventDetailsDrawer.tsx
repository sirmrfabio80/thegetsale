import { format } from "date-fns";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import type { SaleEventDTO } from "@/lib/admin-sales.functions";
import { marketLabel } from "@/lib/markets";

type Props = {
  event: SaleEventDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (event: SaleEventDTO) => void;
};

export function SaleEventDetailsDrawer({ event, open, onOpenChange, onEdit }: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{event?.brandName ?? "Sale event"}</DrawerTitle>
          <DrawerDescription>
            {event
              ? (event.category ?? "Uncategorised") + " · " + event.saleType.replace("_", " ")
              : ""}
          </DrawerDescription>
        </DrawerHeader>

        {event && (
          <div className="max-h-[60vh] overflow-y-auto px-4 pb-2">
            <dl className="divide-y divide-border border-y border-border text-sm">
              <Field label="Status" value={<StatusBadge status={event.status} />} />
              <Field label="Brand" value={event.brandName ?? "—"} />
              <Field label="Category" value={event.category ?? "—"} />
              <Field label="Sale type" value={event.saleType.replace("_", " ")} />
              <Field label="Start date" value={fmt(event.startDate)} />
              <Field label="End date" value={event.endDate ? fmt(event.endDate) : "—"} />
              <Field
                label="Discount"
                value={formatDiscount(event.discountMin, event.discountMax)}
              />
              <Field
                label="Admin notes"
                value={
                  event.adminNotes ? (
                    <span className="whitespace-pre-wrap">{event.adminNotes}</span>
                  ) : (
                    "—"
                  )
                }
              />
            </dl>
          </div>
        )}

        <DrawerFooter className="flex-row justify-end gap-2">
          {event && onEdit && (
            <Button variant="outline" className="rounded-none" onClick={() => onEdit(event)}>
              Edit
            </Button>
          )}
          <Button className="rounded-none" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-start gap-3 py-3">
      <dt className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "published"
      ? "border-foreground text-foreground"
      : "border-border text-muted-foreground";
  return (
    <span
      className={"inline-block border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] " + cls}
    >
      {status}
    </span>
  );
}

function fmt(d: string) {
  try {
    return format(new Date(d + "T00:00:00"), "d MMM yyyy");
  } catch {
    return d;
  }
}

function formatDiscount(min: number | null, max: number | null) {
  if (min == null && max == null) return "—";
  if (min != null && max != null && min !== max) return `${min}–${max}%`;
  return `${max ?? min}%`;
}
