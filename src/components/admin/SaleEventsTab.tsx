import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
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
  bulkSetSaleEventStatus,
  bulkDeleteSaleEvents,
  SALE_TYPES,
  SALE_STATUSES,
  type SaleEventDTO,
} from "@/lib/admin-sales.functions";
import { SaleEventDrawer } from "./SaleEventDrawer";

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
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);

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
    onMutate: (vars) => {
      setPendingStatusId(vars.id);
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["admin", "sale_events"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Couldn't update status"),
    onSettled: () => setPendingStatusId(null),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Sale event deleted");
      qc.invalidateQueries({ queryKey: ["admin", "sale_events"] });
      setToDelete(null);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Couldn't delete"),
  });

  const brands = brandsQ.data ?? [];
  const rows = listQ.data ?? [];
  const brandMap = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands]);
  const hasFilters =
    !!filters.brandId || !!filters.category || !!filters.saleType || !!filters.status;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-end md:justify-between">
        <div className="grid w-full grid-cols-2 gap-3 md:w-auto md:grid-cols-4">
          <div>
            <label className="eyebrow mb-1 block">Brand</label>
            <Select
              value={filters.brandId ?? ANY}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, brandId: v === ANY ? undefined : v }))
              }
            >
              <SelectTrigger className="h-10 w-full rounded-none md:w-44">
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
              className="h-10 w-full rounded-none md:w-44"
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
              <SelectTrigger className="h-10 w-full rounded-none md:w-44">
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
              <SelectTrigger className="h-10 w-full rounded-none md:w-44">
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
          className="h-11 w-full rounded-none px-5 text-[11px] uppercase tracking-[0.18em] md:w-auto"
        >
          Add sale event
        </Button>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {listQ.isLoading
            ? "Loading…"
            : `${rows.length} sale event${rows.length === 1 ? "" : "s"}`}
        </span>
        {hasFilters && (
          <button
            type="button"
            onClick={() => setFilters({})}
            className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Mobile: card list */}
      <div className="space-y-3 md:hidden">
        {listQ.isLoading && (
          <div className="border border-border py-8 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        )}
        {!listQ.isLoading && rows.length === 0 && (
          <div className="border border-border py-8 text-center text-sm text-muted-foreground">
            No sale events yet.
          </div>
        )}
        {rows.map((r) => (
          <div key={r.id} className="border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="font-medium">
                {r.brandName ?? brandMap.get(r.brandId) ?? "—"}
              </div>
              <span
                className={
                  "inline-block shrink-0 border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] " +
                  statusClass(r.status)
                }
              >
                {r.status}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {(r.category ?? "—") + " · " + r.saleType.replace("_", " ")}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
              <span>
                {fmt(r.startDate)}
                {" → "}
                {r.endDate ? fmt(r.endDate) : "—"}
              </span>
              <span className="text-muted-foreground">
                {formatDiscount(r.discountMin, r.discountMax)}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
              <button
                type="button"
                className="h-10 border border-border px-3 text-[11px] uppercase tracking-[0.18em] text-foreground"
                onClick={() => {
                  setEditing(r);
                  setDialogOpen(true);
                }}
              >
                Edit
              </button>
              {r.status !== "draft" && (
                <button
                  type="button"
                  disabled={pendingStatusId === r.id}
                  className="h-10 border border-border px-3 text-[11px] uppercase tracking-[0.18em] text-foreground disabled:opacity-50"
                  onClick={() =>
                    statusMut.mutate({ id: r.id, status: "draft" })
                  }
                >
                  {pendingStatusId === r.id ? "Updating…" : "Draft"}
                </button>
              )}
              {r.status !== "published" && (
                <button
                  type="button"
                  disabled={pendingStatusId === r.id}
                  className="h-10 border border-border px-3 text-[11px] uppercase tracking-[0.18em] text-foreground disabled:opacity-50"
                  onClick={() =>
                    statusMut.mutate({ id: r.id, status: "published" })
                  }
                >
                  {pendingStatusId === r.id ? "Updating…" : "Publish"}
                </button>
              )}
              {r.status !== "hidden" && (
                <button
                  type="button"
                  disabled={pendingStatusId === r.id}
                  className="h-10 border border-border px-3 text-[11px] uppercase tracking-[0.18em] text-foreground disabled:opacity-50"
                  onClick={() =>
                    statusMut.mutate({ id: r.id, status: "hidden" })
                  }
                >
                  {pendingStatusId === r.id ? "Updating…" : "Hide"}
                </button>
              )}
              <button
                type="button"
                className="h-10 border border-border px-3 text-[11px] uppercase tracking-[0.18em] text-destructive ml-auto"
                onClick={() => setToDelete(r)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden border border-border md:block">
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
                    {r.status !== "draft" && (
                      <button
                        type="button"
                        disabled={pendingStatusId === r.id}
                        className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground disabled:opacity-50"
                        onClick={() =>
                          statusMut.mutate({ id: r.id, status: "draft" })
                        }
                      >
                        {pendingStatusId === r.id ? "Updating…" : "Draft"}
                      </button>
                    )}
                    {r.status !== "published" && (
                      <button
                        type="button"
                        disabled={pendingStatusId === r.id}
                        className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground disabled:opacity-50"
                        onClick={() =>
                          statusMut.mutate({ id: r.id, status: "published" })
                        }
                      >
                        {pendingStatusId === r.id ? "Updating…" : "Publish"}
                      </button>
                    )}
                    {r.status !== "hidden" && (
                      <button
                        type="button"
                        disabled={pendingStatusId === r.id}
                        className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground disabled:opacity-50"
                        onClick={() =>
                          statusMut.mutate({ id: r.id, status: "hidden" })
                        }
                      >
                        {pendingStatusId === r.id ? "Updating…" : "Hide"}
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

      <SaleEventDrawer
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
