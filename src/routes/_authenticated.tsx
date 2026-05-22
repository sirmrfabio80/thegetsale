import { createFileRoute, Outlet, redirect, useHydrated, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function isAuthShapedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /Unauthorized|JWT|issued at future|AuthSession|Invalid token|Invalid Refresh Token/i.test(msg);
}

function AuthErrorRecovery({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    if (!isAuthShapedError(error)) return;
    let cancelled = false;
    (async () => {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // ignore
      }
      if (cancelled) return;
      reset();
      router.invalidate();
      router.navigate({ to: "/login" });
    })();
    return () => {
      cancelled = true;
    };
  }, [error, reset, router]);

  // Re-throw non-auth errors so the root errorComponent handles them.
  if (!isAuthShapedError(error)) throw error;

  return <HydratingShell />;
}

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context }) => {
    if (context.auth?.status === "unauthenticated") {
      throw redirect({ to: "/" });
    }
  },
  component: AuthenticatedLayout,
  errorComponent: AuthErrorRecovery,
});

function AuthenticatedLayout() {
  const { auth } = Route.useRouteContext();
  const hydrated = useHydrated();
  // SSR always renders HydratingShell (server auth snapshot is "loading").
  // Match that on the first client commit to avoid a hydration mismatch
  // when the module-scoped auth store is already "authenticated" client-side.
  if (!hydrated || auth.status === "loading") return <HydratingShell />;
  return <Outlet />;
}


function HydratingShell() {
  const [slow, setSlow] = useState(false);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const t1 = window.setTimeout(() => setSlow(true), 1800);
    const t2 = window.setTimeout(() => setStuck(true), 7000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground" aria-busy="true" aria-live="polite">
      {/* Top nav skeleton — mirrors PageLayout chrome */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4 md:px-10">
          <span className="font-serif text-2xl leading-none tracking-tight text-foreground/90">
            The Get
          </span>
          <div className="flex items-center gap-3">
            <Shimmer className="h-3 w-16" />
            <Shimmer className="h-3 w-20" />
            <Shimmer className="ml-2 h-9 w-9 rounded-full" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 md:px-10">
        <section className="pt-16 md:pt-24">
          <Shimmer className="h-3 w-28" />
          <div className="mt-5 space-y-3">
            <Shimmer className="h-10 w-3/4 md:h-14" />
            <Shimmer className="h-10 w-1/2 md:h-14" />
          </div>
          <div className="mt-6 space-y-2">
            <Shimmer className="h-3 w-2/3 max-w-md" />
            <Shimmer className="h-3 w-1/2 max-w-sm" />
          </div>
        </section>

        <div className="my-10 hairline" />

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </section>

        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {stuck
              ? "Still working…"
              : slow
              ? "Reading the room — one moment"
              : "Tuning the signal"}
          </p>
          {stuck && (
            <a
              href="/login"
              className="text-[11px] uppercase tracking-[0.18em] text-foreground underline-offset-4 hover:underline"
            >
              Sign in again
            </a>
          )}
        </div>
      </main>

      <style>{`
        @keyframes theget-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="border border-border p-6">
      <div className="flex items-center justify-between">
        <Shimmer className="h-3 w-20" />
        <Shimmer className="h-3 w-12" />
      </div>
      <Shimmer className="mt-6 h-8 w-2/3" />
      <Shimmer className="mt-3 h-3 w-5/6" />
      <Shimmer className="mt-2 h-3 w-3/5" />
      <div className="mt-6 flex items-center gap-3">
        <Shimmer className="h-9 w-28" />
        <Shimmer className="h-9 w-20" />
      </div>
    </div>
  );
}

function Shimmer({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block bg-muted ${className}`}
      style={{
        backgroundImage:
          "linear-gradient(90deg, color-mix(in oklab, var(--color-muted) 100%, transparent) 0%, color-mix(in oklab, var(--color-foreground) 6%, var(--color-muted)) 50%, color-mix(in oklab, var(--color-muted) 100%, transparent) 100%)",
        backgroundSize: "200% 100%",
        animation: "theget-shimmer 1.6s ease-in-out infinite",
      }}
    />
  );
}
