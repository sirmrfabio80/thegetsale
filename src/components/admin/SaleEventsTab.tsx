import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/lib/toast";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
  SALE_TYPE_LABELS,
  SALE_STATUSES,
  type SaleEventDTO,
} from "@/lib/admin-sales.functions";

import { SaleEventDrawer } from "./SaleEventDrawer";
import { SaleEventDetailsDrawer } from "./SaleEventDetailsDrawer";
import { MARKETS, marketLabel } from "@/lib/markets";

type Filters = {
  brandId?: string;
  category?: string;
  saleType?: string;
  status?: string;
  countryCode?: string; // "" = Global only, undefined = any
};

const ANY = "__any__";
const GLOBAL = "__global__";

export function SaleEventsTab() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<Filters>({});
  const [editing, setEditing] = useState<SaleEventDTO | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<SaleEventDTO | null>(null);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmDelete, setBulkConfirmDelete] = useState(false);
  const [viewing, setViewing] = useState<SaleEventDTO | null>(null);
  const MOBILE_PAGE_SIZE = 20;
  const [mobileLimit, setMobileLimit] = useState(MOBILE_PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const savedScrollRef = useRef<number | null>(null);

  const updateFilters = (updater: (f: Filters) => Filters) => {
    if (typeof window !== "undefined") {
      savedScrollRef.current = window.scrollY;
    }
    setFilters(updater);
  };

  const fetchList = useServerFn(listSaleEvents);
  const fetchBrands = useServerFn(listBrandOptions);
  const setStatusFn = useServerFn(setSaleEventStatus);
  const deleteFn = useServerFn(deleteSaleEvent);
  const bulkStatusFn = useServerFn(bulkSetSaleEventStatus);
  const bulkDeleteFn = useServerFn(bulkDeleteSaleEvents);

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
          countryCode: filters.countryCode ?? null,
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
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Couldn't update status"),
    onSettled: () => setPendingStatusId(null),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Sale event deleted");
      qc.invalidateQueries({ queryKey: ["admin", "sale_events"] });
      setToDelete(null);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Couldn't delete"),
  });

  const bulkStatusMut = useMutation({
    mutationFn: (vars: { ids: string[]; status: "draft" | "published" | "hidden" }) =>
      bulkStatusFn({ data: vars }),
    onSuccess: (_d, vars) => {
      toast.success(
        `${vars.ids.length} sale event${vars.ids.length === 1 ? "" : "s"} set to ${vars.status}`,
      );
      qc.invalidateQueries({ queryKey: ["admin", "sale_events"] });
      setSelectedIds(new Set());
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Couldn't update selection"),
  });

  const bulkDeleteMut = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteFn({ data: { ids } }),
    onSuccess: (_d, ids) => {
      toast.success(`${ids.length} sale event${ids.length === 1 ? "" : "s"} deleted`);
      qc.invalidateQueries({ queryKey: ["admin", "sale_events"] });
      setSelectedIds(new Set());
      setBulkConfirmDelete(false);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Couldn't delete selection"),
  });

  const brands = brandsQ.data ?? [];
  const rows = listQ.data ?? [];
  const brandMap = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands]);
  const hasFilters =
    !!filters.brandId ||
    !!filters.category ||
    !!filters.saleType ||
    !!filters.status ||
    filters.countryCode !== undefined;

  const visibleIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const selectedCount = selectedIds.size;
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));
  const bulkBusy = bulkStatusMut.isPending || bulkDeleteMut.isPending;

  // Drop selections for rows no longer in the visible list (filter changes, deletions)
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set<string>();
      for (const id of prev) if (visibleIds.includes(id)) next.add(id);
      return next.size === prev.size ? prev : next;
    });
  }, [visibleIds]);

  const toggleOne = (id: string, checked: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const toggleAllVisible = (checked: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) for (const id of visibleIds) next.add(id);
      else for (const id of visibleIds) next.delete(id);
      return next;
    });

  // Reset mobile pagination when filter results change
  useEffect(() => {
    setMobileLimit(MOBILE_PAGE_SIZE);
  }, [filters, rows.length]);

  const mobileRows = useMemo(() => rows.slice(0, mobileLimit), [rows, mobileLimit]);
  const hasMoreMobile = mobileLimit < rows.length;

  // IntersectionObserver to load more cards as the sentinel scrolls into view
  useEffect(() => {
    if (!hasMoreMobile) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMobileLimit((n) => Math.min(n + MOBILE_PAGE_SIZE, rows.length));
        }
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMoreMobile, rows.length]);

  // Restore scroll position after a filter change once the new list has rendered
  useEffect(() => {
    if (savedScrollRef.current == null) return;
    if (listQ.isFetching) return;
    const y = savedScrollRef.current;
    savedScrollRef.current = null;
    const raf = requestAnimationFrame(() => {
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({ top: Math.min(y, max) });
    });
    return () => cancelAnimationFrame(raf);
  }, [listQ.isFetching, rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-end md:justify-between">
        <div className="grid w-full grid-cols-2 gap-3 md:w-auto md:grid-cols-5">
          <div>
            <label className="eyebrow mb-1 block">Brand</label>
            <Select
              value={filters.brandId ?? ANY}
              onValueChange={(v) =>
                updateFilters((f) => ({ ...f, brandId: v === ANY ? undefined : v }))
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
                updateFilters((f) => ({ ...f, category: e.target.value || undefined }))
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
                updateFilters((f) => ({ ...f, saleType: v === ANY ? undefined : v }))
              }
            >
              <SelectTrigger className="h-10 w-full rounded-none md:w-44">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any type</SelectItem>
                {SALE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {SALE_TYPE_LABELS[t]}
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
                updateFilters((f) => ({ ...f, status: v === ANY ? undefined : v }))
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
          <div>
            <label className="eyebrow mb-1 block">Market</label>
            <Select
              value={
                filters.countryCode === undefined
                  ? ANY
                  : filters.countryCode === ""
                    ? GLOBAL
                    : filters.countryCode
              }
              onValueChange={(v) =>
                updateFilters((f) => ({
                  ...f,
                  countryCode: v === ANY ? undefined : v === GLOBAL ? "" : v,
                }))
              }
            >
              <SelectTrigger className="h-10 w-full rounded-none md:w-44">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any market</SelectItem>
                <SelectItem value={GLOBAL}>Global only</SelectItem>
                {MARKETS.map((m) => (
                  <SelectItem key={m.code} value={m.code}>
                    {m.label}
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
            onClick={() => updateFilters(() => ({}))}
            className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          >
            Clear filters
          </button>
        )}
      </div>

      {selectedCount > 0 && (
        <div
          aria-busy={bulkBusy}
          className={
            "sticky top-0 z-10 flex flex-col gap-3 border border-foreground bg-background p-3 transition-opacity sm:flex-row sm:items-center sm:justify-between " +
            (bulkBusy ? "opacity-80" : "")
          }
        >
          <div className="flex items-center gap-3 text-sm">
            {bulkBusy && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
            )}
            <span className="font-medium">
              {bulkBusy
                ? bulkActionLabel(
                    bulkStatusMut.isPending ? bulkStatusMut.variables?.status : "delete",
                    selectedCount,
                  )
                : `${selectedCount} selected`}
            </span>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => setSelectedIds(new Set())}
              className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:hover:text-muted-foreground"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["published", "hidden", "draft"] as const).map((s) => {
              const active = bulkStatusMut.isPending && bulkStatusMut.variables?.status === s;
              const label = s === "published" ? "Publish" : s === "hidden" ? "Hide" : "Draft";
              return (
                <button
                  key={s}
                  type="button"
                  disabled={bulkBusy}
                  onClick={() =>
                    bulkStatusMut.mutate({
                      ids: Array.from(selectedIds),
                      status: s,
                    })
                  }
                  className="inline-flex h-9 items-center gap-2 border border-border px-3 text-[11px] uppercase tracking-[0.18em] text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {active && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                  {active ? "Working…" : label}
                </button>
              );
            })}
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => setBulkConfirmDelete(true)}
              className="inline-flex h-9 items-center gap-2 border border-destructive px-3 text-[11px] uppercase tracking-[0.18em] text-destructive disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bulkDeleteMut.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              )}
              {bulkDeleteMut.isPending ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      )}

      {/* Mobile: card list */}
      <div className="space-y-3 md:hidden">
        {listQ.isLoading && (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border border-border p-4" aria-hidden>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Skeleton className="mt-0.5 h-4 w-4" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="mt-2 h-3 w-40" />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                  <Skeleton className="h-10 w-14" />
                  <Skeleton className="h-10 w-16" />
                  <Skeleton className="h-10 w-14" />
                  <Skeleton className="ml-auto h-10 w-16" />
                </div>
              </div>
            ))}
            <span className="sr-only">Loading sale events…</span>
          </>
        )}
        {!listQ.isLoading && rows.length === 0 && (
          <div className="flex flex-col items-center gap-4 border border-border py-10 px-4 text-center">
            <p className="text-sm text-muted-foreground">
              {hasFilters ? "No sale events match these filters." : "No sale events yet."}
            </p>
            {hasFilters ? (
              <Button
                variant="outline"
                onClick={() => updateFilters(() => ({}))}
                className="h-11 rounded-none px-5 text-[11px] uppercase tracking-[0.18em]"
              >
                Clear filters
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
                className="h-11 rounded-none px-5 text-[11px] uppercase tracking-[0.18em]"
              >
                Add sale event
              </Button>
            )}
          </div>
        )}
        {mobileRows.map((r) => (
          <div
            key={r.id}
            className={
              "border p-4 " + (selectedIds.has(r.id) ? "border-foreground" : "border-border")
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedIds.has(r.id)}
                  onCheckedChange={(v) => toggleOne(r.id, v === true)}
                  aria-label={`Select ${r.brandName ?? "sale event"}`}
                  className="mt-0.5"
                />
                <div className="font-medium">{r.brandName ?? brandMap.get(r.brandId) ?? "—"}</div>
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
              {marketLabel(r.countryCode) + " · " + (r.category ?? "—") + " · " + (SALE_TYPE_LABELS[r.saleType as keyof typeof SALE_TYPE_LABELS] ?? r.saleType)}
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
                className="h-10 border border-foreground bg-foreground px-3 text-[11px] uppercase tracking-[0.18em] text-background"
                onClick={() => setViewing(r)}
              >
                View
              </button>
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
                  onClick={() => statusMut.mutate({ id: r.id, status: "draft" })}
                >
                  {pendingStatusId === r.id ? "Updating…" : "Draft"}
                </button>
              )}
              {r.status !== "published" && (
                <button
                  type="button"
                  disabled={pendingStatusId === r.id}
                  className="h-10 border border-border px-3 text-[11px] uppercase tracking-[0.18em] text-foreground disabled:opacity-50"
                  onClick={() => statusMut.mutate({ id: r.id, status: "published" })}
                >
                  {pendingStatusId === r.id ? "Updating…" : "Publish"}
                </button>
              )}
              {r.status !== "hidden" && (
                <button
                  type="button"
                  disabled={pendingStatusId === r.id}
                  className="h-10 border border-border px-3 text-[11px] uppercase tracking-[0.18em] text-foreground disabled:opacity-50"
                  onClick={() => statusMut.mutate({ id: r.id, status: "hidden" })}
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
        {hasMoreMobile && (
          <>
            <div ref={sentinelRef} aria-hidden className="h-px w-full" />
            <button
              type="button"
              onClick={() => setMobileLimit((n) => Math.min(n + MOBILE_PAGE_SIZE, rows.length))}
              className="h-11 w-full border border-border text-[11px] uppercase tracking-[0.18em] text-foreground"
            >
              Load more ({rows.length - mobileLimit} remaining)
            </button>
          </>
        )}
        {!listQ.isLoading && rows.length > 0 && !hasMoreMobile && (
          <div className="py-2 text-center text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            End of list
          </div>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden border border-border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false
                  }
                  onCheckedChange={(v) => toggleAllVisible(v === true)}
                  aria-label="Select all visible sale events"
                  disabled={visibleIds.length === 0}
                />
              </TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Market</TableHead>
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
            {listQ.isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`sk-${i}`} aria-hidden>
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Skeleton className="h-4 w-10" />
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-10" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            {listQ.isLoading && (
              <TableRow>
                <TableCell colSpan={10} className="sr-only">
                  Loading sale events…
                </TableCell>
              </TableRow>
            )}
            {!listQ.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-sm text-muted-foreground">
                  No sale events yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id} data-state={selectedIds.has(r.id) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(r.id)}
                    onCheckedChange={(v) => toggleOne(r.id, v === true)}
                    aria-label={`Select ${r.brandName ?? "sale event"}`}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {r.brandName ?? brandMap.get(r.brandId) ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {marketLabel(r.countryCode)}
                </TableCell>
                <TableCell className="text-muted-foreground">{r.category ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {SALE_TYPE_LABELS[r.saleType as keyof typeof SALE_TYPE_LABELS] ?? r.saleType}
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
                        onClick={() => statusMut.mutate({ id: r.id, status: "draft" })}
                      >
                        {pendingStatusId === r.id ? "Updating…" : "Draft"}
                      </button>
                    )}
                    {r.status !== "published" && (
                      <button
                        type="button"
                        disabled={pendingStatusId === r.id}
                        className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground disabled:opacity-50"
                        onClick={() => statusMut.mutate({ id: r.id, status: "published" })}
                      >
                        {pendingStatusId === r.id ? "Updating…" : "Publish"}
                      </button>
                    )}
                    {r.status !== "hidden" && (
                      <button
                        type="button"
                        disabled={pendingStatusId === r.id}
                        className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground disabled:opacity-50"
                        onClick={() => statusMut.mutate({ id: r.id, status: "hidden" })}
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

      <SaleEventDetailsDrawer
        event={viewing}
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        onEdit={(ev) => {
          setViewing(null);
          setEditing(ev);
          setDialogOpen(true);
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

      <AlertDialog open={bulkConfirmDelete} onOpenChange={setBulkConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedCount} sale event{selectedCount === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the selected records permanently. It can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMut.mutate(Array.from(selectedIds))}
              disabled={bulkDeleteMut.isPending || selectedCount === 0}
            >
              {bulkDeleteMut.isPending ? "Deleting…" : "Delete"}
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

function bulkActionLabel(
  action: "published" | "hidden" | "draft" | "delete" | undefined,
  count: number,
) {
  const noun = `${count} item${count === 1 ? "" : "s"}`;
  switch (action) {
    case "published":
      return `Publishing ${noun}…`;
    case "hidden":
      return `Hiding ${noun}…`;
    case "draft":
      return `Moving ${noun} to draft…`;
    case "delete":
      return `Deleting ${noun}…`;
    default:
      return `Updating ${noun}…`;
  }
}
