import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadSetup } from "@/data/setupStorage";
import { safeRedirect } from "@/lib/safeRedirect";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
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
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (cancelled) return;
          // If a redirect was supplied, validate it; otherwise fall back to setup/dashboard.
          if (redirectTo !== undefined) {
            const safe = safeRedirect(redirectTo, "/dashboard");
            // Prefer typed navigation for known routes so params are validated.
            const brandMatch = safe.match(/^\/brand\/([^/?#]+)$/);
            if (brandMatch) {
              navigate({ to: "/brand/$id", params: { id: brandMatch[1] } });
            } else {
              navigate({ to: safe });
            }
            return;
          }
          const setup = loadSetup();
          navigate({ to: setup?.completedAt ? "/dashboard" : "/setup" });
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
