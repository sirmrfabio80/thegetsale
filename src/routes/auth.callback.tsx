import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMySetup } from "@/lib/setup.functions";
import { resolveRedirect } from "@/lib/safeRedirect";
import { getMyProfile, setMyMarket } from "@/lib/profile.functions";
import { clearPendingMarket, readPendingMarket } from "@/lib/detect-market";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === "string" ? { redirect: search.redirect } : {},
  head: () => ({
    meta: [{ title: "Signing you in — The Get" }],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();

  useEffect(() => {
    let cancelled = false;

    const decide = async () => {
      // Small grace period to let the Lovable broker complete setSession.
      for (let i = 0; i < 25; i++) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          if (cancelled) return;

          // If a pending market was stashed before OAuth, persist it now
          // (only when the profile doesn't already have one set).
          const pendingMarket = readPendingMarket();
          if (pendingMarket) {
            try {
              const profile = await getMyProfile();
              if (!profile.market) {
                await setMyMarket({ data: { market: pendingMarket } });
              }
            } catch {
              /* non-blocking — user can set market from profile */
            }
            clearPendingMarket();
          }

          // If a redirect was supplied, validate it; otherwise fall back to setup/dashboard.
          if (redirectTo !== undefined) {
            const resolved = resolveRedirect(redirectTo, "/dashboard");
            // Prefer typed navigation for known routes so params are validated.
            if (resolved.kind === "brand") {
              navigate({ to: "/brand/$id", params: { id: resolved.id } });
            } else {
              navigate({ to: resolved.to });
            }
            return;
          }
          // Decide setup vs dashboard from the backend record.
          let completed = false;
          try {
            const setup = await getMySetup();
            completed = !!setup?.completedAt;
          } catch {
            // Network/auth blip — default to setup so we don't dump
            // a fresh user straight into the dashboard.
            completed = false;
          }
          if (cancelled) return;
          navigate({ to: completed ? "/dashboard" : "/setup" });
          return;
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      if (!cancelled) navigate({ to: "/login" });
    };

    decide();
    return () => {
      cancelled = true;
    };
  }, [navigate, redirectTo]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <p className="eyebrow">Welcome</p>
        <h1 className="mt-3 font-serif text-3xl text-foreground">Signing you in…</h1>
        <p className="mt-3 text-sm text-muted-foreground">A quieter way to shop, almost ready.</p>
      </div>
    </div>
  );
}
