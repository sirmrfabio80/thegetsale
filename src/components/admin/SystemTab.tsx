import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { listPredictionRuns } from "@/lib/admin.functions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function SystemTab() {
  const fetchRuns = useServerFn(listPredictionRuns);
  const q = useQuery({ queryKey: ["admin", "runs"], queryFn: () => fetchRuns() });
  const rows = q.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Prediction runs</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Most recent runs of the sale prediction job. Read-only.
        </p>
      </div>

      <div className="border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Started</TableHead>
              <TableHead>Finished</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Algorithm</TableHead>
              <TableHead>Brands</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!q.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  No runs yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{fmt(r.startedAt)}</TableCell>
                <TableCell>{r.finishedAt ? fmt(r.finishedAt) : "—"}</TableCell>
                <TableCell className="text-muted-foreground">{r.status}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {r.algorithmVersion}
                </TableCell>
                <TableCell>{r.brandsProcessed}</TableCell>
                <TableCell>{r.predictionsCreated}</TableCell>
                <TableCell>{r.predictionsUpdated}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function fmt(d: string) {
  try {
    return format(new Date(d), "d MMM yyyy, HH:mm");
  } catch {
    return d;
  }
}
