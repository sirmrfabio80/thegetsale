import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/lib/toast";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  listHouses,
  setHouseActive,
  HOUSE_GROUPS,
  type HouseDTO,
} from "@/lib/admin-houses.functions";
import { backfillBrandLogos } from "@/lib/admin-logo-backfill.functions";
import { HouseDrawer } from "./HouseDrawer";

type Filters = {
  search?: string;
  group?: string;
  status?: "active" | "inactive" | "all";
};

const ANY = "__any__";

export function HousesTab() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<Filters>({ status: "active" });
  const [editing, setEditing] = useState<HouseDTO | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const fetchList = useServerFn(listHouses);
  const setActiveFn = useServerFn(setHouseActive);
  const backfillFn = useServerFn(backfillBrandLogos);

  const backfillMut = useMutation({
    mutationFn: () => backfillFn(),
    onSuccess: (r) => {
      if (r.error === "missing_token") {
        toast.error("Logo provider token isn't configured");
        return;
      }
      const skipped = r.skipped.length;
      const errs = r.errors.length;
      const parts = [`Updated ${r.updated}`];
      if (skipped) parts.push(`skipped ${skipped}`);
      if (errs) parts.push(`${errs} error${errs === 1 ? "" : "s"}`);
      const tail =
        r.remaining > 0
          ? ` · ${r.remaining} remaining — click again to continue`
          : " · all caught up";
      toast.success(parts.join(" · ") + tail);
      qc.invalidateQueries({ queryKey: ["admin", "houses"] });
      qc.invalidateQueries({ queryKey: ["admin", "brands"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Couldn't fetch logos"),
  });

  const listQ = useQuery({
    queryKey: ["admin", "houses", filters],
    queryFn: () =>
      fetchList({
        data: {
          search: filters.search ?? null,
          group: filters.group ?? null,
          status: filters.status ?? "all",
        },
      }),
  });

  const activeMut = useMutation({
    mutationFn: (vars: { id: string; isActive: boolean }) => setActiveFn({ data: vars }),
    onMutate: (vars) => setPendingId(vars.id),
    onSuccess: (_d, vars) => {
      toast.success(vars.isActive ? "House activated" : "House deactivated");
      qc.invalidateQueries({ queryKey: ["admin", "houses"] });
      qc.invalidateQueries({ queryKey: ["admin", "brands"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Couldn't update"),
    onSettled: () => setPendingId(null),
  });

  const rows = listQ.data ?? [];
  const hasFilters =
    !!filters.search || !!filters.group || (filters.status && filters.status !== "active");

  const onSaved = () => {
    setDrawerOpen(false);
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin", "houses"] });
    qc.invalidateQueries({ queryKey: ["admin", "brands"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-3xl leading-tight">House management</h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Create and maintain the fashion houses used across sale events, signals and the dashboard.
        </p>
      </div>

      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-end md:justify-between">
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 md:w-auto">
          <div>
            <label className="eyebrow mb-1 block">Search</label>
            <Input
              value={filters.search ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
              placeholder="House name"
              className="h-10 w-full rounded-none md:w-48"
            />
          </div>
          <div>
            <label className="eyebrow mb-1 block">Group</label>
            <Select
              value={filters.group ?? ANY}
              onValueChange={(v) => setFilters((f) => ({ ...f, group: v === ANY ? undefined : v }))}
            >
              <SelectTrigger className="h-10 w-full rounded-none md:w-44">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any group</SelectItem>
                {HOUSE_GROUPS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="eyebrow mb-1 block">Status</label>
            <Select
              value={filters.status ?? "all"}
              onValueChange={(v) => setFilters((f) => ({ ...f, status: v as Filters["status"] }))}
            >
              <SelectTrigger className="h-10 w-full rounded-none md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
          <Button
            variant="outline"
            disabled={backfillMut.isPending}
            onClick={() => backfillMut.mutate()}
            className="h-11 w-full rounded-none px-5 text-[11px] uppercase tracking-[0.18em] md:w-auto"
          >
            {backfillMut.isPending ? "Fetching…" : "Fetch missing logos"}
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setDrawerOpen(true);
            }}
            className="h-11 w-full rounded-none px-5 text-[11px] uppercase tracking-[0.18em] md:w-auto"
          >
            Add house
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {listQ.isLoading ? "Loading…" : `${rows.length} house${rows.length === 1 ? "" : "s"}`}
        </span>
        {hasFilters && (
          <button
            type="button"
            onClick={() => setFilters({ status: "active" })}
            className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {listQ.isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-border p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-2 h-3 w-32" />
              <div className="mt-4 flex gap-2">
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          ))}
        {!listQ.isLoading && rows.length === 0 && (
          <div className="flex flex-col items-center gap-4 border border-border py-10 px-4 text-center">
            <p className="text-sm text-muted-foreground">
              {hasFilters ? "No houses match these filters." : "No houses yet."}
            </p>
            <Button
              onClick={() => {
                setEditing(null);
                setDrawerOpen(true);
              }}
              className="h-11 rounded-none px-5 text-[11px] uppercase tracking-[0.18em]"
            >
              Add house
            </Button>
          </div>
        )}
        {rows.map((r) => (
          <div key={r.id} className="border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{r.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.slug}</p>
              </div>
              <StatusPill active={r.isActive} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-y-1 text-xs text-muted-foreground">
              <dt>Group</dt>
              <dd className="text-right text-foreground">{r.houseGroup ?? "—"}</dd>
              <dt>Country</dt>
              <dd className="text-right text-foreground">{r.country ?? "—"}</dd>
              <dt>Updated</dt>
              <dd className="text-right text-foreground">
                {format(new Date(r.updatedAt), "d MMM yyyy")}
              </dd>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(r);
                  setDrawerOpen(true);
                }}
                className="h-11 rounded-none px-4 text-[11px] uppercase tracking-[0.18em]"
              >
                Edit
              </Button>
              <Button
                variant="outline"
                disabled={pendingId === r.id}
                onClick={() => activeMut.mutate({ id: r.id, isActive: !r.isActive })}
                className="h-11 rounded-none px-4 text-[11px] uppercase tracking-[0.18em]"
              >
                {pendingId === r.id ? "Working…" : r.isActive ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>House</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQ.isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {!listQ.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  {hasFilters ? "No houses match these filters." : "No houses yet."}
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.slug}</div>
                </TableCell>
                <TableCell>{r.houseGroup ?? "—"}</TableCell>
                <TableCell>{r.country ?? "—"}</TableCell>
                <TableCell>
                  <StatusPill active={r.isActive} />
                </TableCell>
                <TableCell>{format(new Date(r.updatedAt), "d MMM yyyy")}</TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(r);
                        setDrawerOpen(true);
                      }}
                      className="border border-border px-3 py-2 text-[11px] uppercase tracking-[0.18em] hover:bg-foreground hover:text-background"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={pendingId === r.id}
                      onClick={() => activeMut.mutate({ id: r.id, isActive: !r.isActive })}
                      className="border border-border px-3 py-2 text-[11px] uppercase tracking-[0.18em] hover:bg-foreground hover:text-background disabled:opacity-50"
                    >
                      {pendingId === r.id ? "…" : r.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <HouseDrawer
        open={drawerOpen}
        onOpenChange={(o) => {
          setDrawerOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
        onSaved={onSaved}
      />
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={
        "inline-flex items-center border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] " +
        (active ? "border-foreground text-foreground" : "border-border text-muted-foreground")
      }
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}
