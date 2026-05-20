import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listUsersWithRoles, setUserAdmin } from "@/lib/admin.functions";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function UsersRolesTab() {
  const auth = useAuth();
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listUsersWithRoles);
  const setAdmin = useServerFn(setUserAdmin);

  const q = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => fetchUsers(),
  });

  const mut = useMutation({
    mutationFn: (vars: { userId: string; isAdmin: boolean }) =>
      setAdmin({ data: vars }),
    onSuccess: (_d, vars) => {
      toast.success(vars.isAdmin ? "Admin access granted" : "Admin access revoked");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't update role"),
  });

  const rows = q.data ?? [];

  return (
    <div className="border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Display name</TableHead>
            <TableHead>User ID</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {q.isLoading && (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                Loading…
              </TableCell>
            </TableRow>
          )}
          {!q.isLoading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                No users yet.
              </TableCell>
            </TableRow>
          )}
          {rows.map((u) => {
            const isSelf = u.id === auth.user?.id;
            return (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.displayName ?? "Unnamed"}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {u.id.slice(0, 8)}…
                </TableCell>
                <TableCell>
                  <span
                    className={
                      "inline-block border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] " +
                      (u.isAdmin
                        ? "border-foreground text-foreground"
                        : "border-border text-muted-foreground")
                    }
                  >
                    {u.isAdmin ? "Admin" : "Member"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    disabled={mut.isPending || (isSelf && u.isAdmin)}
                    onClick={() =>
                      mut.mutate({ userId: u.id, isAdmin: !u.isAdmin })
                    }
                    className="h-9 rounded-none px-3 text-[11px] uppercase tracking-[0.18em]"
                    title={
                      isSelf && u.isAdmin ? "You can't revoke your own admin" : undefined
                    }
                  >
                    {u.isAdmin ? "Revoke admin" : "Make admin"}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
