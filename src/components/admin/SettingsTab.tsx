import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/lib/toast";
import {
  getPrivateBetaEnabled,
  setPrivateBetaEnabled,
} from "@/lib/app-settings.functions";
import { PRIVATE_BETA_QUERY_KEY } from "@/hooks/use-private-beta";

export function SettingsTab() {
  const fetcher = useServerFn(getPrivateBetaEnabled);
  const setter = useServerFn(setPrivateBetaEnabled);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: PRIVATE_BETA_QUERY_KEY,
    queryFn: () => fetcher(),
  });

  const m = useMutation({
    mutationFn: (enabled: boolean) => setter({ data: { enabled } }),
    onSuccess: (res) => {
      qc.setQueryData(PRIVATE_BETA_QUERY_KEY, res);
      toast.success(
        res.privateBetaEnabled
          ? "Private beta enabled — signup is hidden."
          : "Private beta disabled — signup is open.",
      );
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Couldn't update setting.");
    },
  });

  const enabled = q.data?.privateBetaEnabled ?? true;
  const disabled = q.isLoading || m.isPending;

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Access</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Control who can join The Get.
        </p>
      </div>

      <label className="flex items-start gap-4 border border-border p-5 cursor-pointer hover:border-foreground/60 transition-colors">
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={(e) => m.mutate(e.target.checked)}
          className="mt-1 h-4 w-4 accent-foreground"
        />
        <div className="space-y-1">
          <p className="text-sm font-medium">Private beta mode</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            When on, the signup page and Google/Apple/email signup buttons are
            hidden across the marketing site. Existing accounts can still sign
            in. Turn off to open registration to anyone.
          </p>
        </div>
      </label>
    </div>
  );
}
