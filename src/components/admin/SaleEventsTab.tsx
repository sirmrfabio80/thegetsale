import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  listSaleEvents,
  listBrandOptions,
  createSaleEvent,
  updateSaleEvent,
  setSaleEventStatus,
  deleteSaleEvent,
  SALE_TYPES,
  SALE_STATUSES,
  type SaleEventDTO,
} from "@/lib/admin-sales.functions";
import { SaleEventDialog } from "./SaleEventDialog";

type Filters = {
  brandId?: string;
  category?: string;
  saleType?: string;
  status?: string;
};

const ANY = "__any__";

export function SaleEventsTab() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<Filters>({});
  const [editing, setEditing] = useState<SaleEventDTO | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<SaleEventDTO | null>(null);

  const fetchList = useServerFn(listSaleEvents);
  const fetchBrands = useServerFn(listBrandOptions);
  const setStatusFn = useServerFn(setSaleEventStatus);
  const deleteFn = useServerFn(deleteSaleEvent);

  const brandsQ = useQuery({
    queryKey: ["admin", "brands"],
    queryFn: () => fetchBrands(),
    staleTime: 60_000,
  });

  const listQ = useQuery({
    queryKey: ["admin", "sale_events", filters],
    queryFn: () =>
      fetchList({
        data: {
          brandId: filters.brandId ?? null,
          category: filters.category ?? null,
          saleType: (filters.saleType as any) ?? null,
          status: (filters.status as any) ?? null,
        },
      }),
  });

  const statusMut = useMutation({
    mutationFn: (vars: { id: string; status: "draft" | "published" | "hidden" }) =>
      setStatusFn({ data: vars }),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["admin", "sale_events"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't update status"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Sale event deleted");
      qc.invalidateQueries({ queryKey: ["admin", "sale_events"] });
      setToDelete(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't delete"),
  });

  const brands = brandsQ.data ?? [];
  const rows = listQ.data ?? [];
  const brandMap = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <label className="eyebrow mb-1 block">Brand</label>
            <Select
              value={filters.brandId ?? ANY}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, brandId: v === ANY ? undefined : v }))
              }
            >
              <SelectTrigger className="h-10 w-44 rounded-none">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any brand</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="eyebrow mb-1 block">Category</label>
            <Input
              value={filters.category ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, category: e.target.value || undefined }))
              }
              placeholder="Any"
              className="h-10 w-44 rounded-none"
            />
          </div>
          <div>
            <label className="eyebrow mb-1 block">Sale type</label>
            <Select
              value={filters.saleType ?? ANY}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, saleType: v === ANY ? undefined : v }))
              }
            >
              <SelectTrigger className="h-10 w-44 rounded-none">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any type</SelectItem>
                {SALE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="eyebrow mb-1 block">Status</label>
            <Select
              value={filters.status ?? ANY}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, status: v === ANY ? undefined : v }))
              }
            >
              <SelectTrigger className="h-10 w-44 rounded-none">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any status</SelectItem>
                {SALE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          className="h-11 rounded-none px-5 text-[11px] uppercase tracking-[0.18em]"
        >
          Add sale event
        </Button>
      </div>

      <div className="border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQ.isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!listQ.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  No sale events yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  {r.brandName ?? brandMap.get(r.brandId) ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{r.category ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {r.saleType.replace("_", " ")}
                </TableCell>
                <TableCell>{fmt(r.startDate)}</TableCell>
                <TableCell>{r.endDate ? fmt(r.endDate) : "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDiscount(r.discountMin, r.discountMax)}
                </TableCell>
                <TableCell>
                  <span
                    className={
                      "inline-block border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] " +
                      statusClass(r.status)
                    }
                  >
                    {r.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setEditing(r);
                        setDialogOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    {r.status !== "published" && (
                      <button
                        type="button"
                        disabled={statusMut.isPending}
                        className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground disabled:opacity-50"
                        onClick={() =>
                          statusMut.mutate({ id: r.id, status: "published" })
                        }
                      >
                        Publish
                      </button>
                    )}
                    {r.status !== "hidden" && (
                      <button
                        type="button"
                        disabled={statusMut.isPending}
                        className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground disabled:opacity-50"
                        onClick={() =>
                          statusMut.mutate({ id: r.id, status: "hidden" })
                        }
                      >
                        Hide
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-[11px] uppercase tracking-[0.18em] text-destructive hover:underline"
                      onClick={() => setToDelete(r)}
                    >
                      Delete
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <SaleEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        brands={brands}
        editing={editing}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["admin", "sale_events"] });
          setDialogOpen(false);
        }}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this sale event?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the record permanently. It can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && deleteMut.mutate(toDelete.id)}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
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

function statusClass(status: string) {
  switch (status) {
    case "published":
      return "border-foreground text-foreground";
    case "hidden":
      return "border-border text-muted-foreground";
    default:
      return "border-border text-muted-foreground";
  }
}
