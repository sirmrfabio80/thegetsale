import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { supabase } from "@/integrations/supabase/client";
import { updatePassword } from "@/lib/auth";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — The Get" },
      { name: "description", content: "Set a new password to regain access." },
    ],
  }),
  component: ResetPasswordPage,
});

const schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters").max(72, "Keep it under 72 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords don't match",
  });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Wait for Supabase to parse the recovery link from the URL hash.
  useEffect(() => {
    let cancelled = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) setReady(true);
    });

    const timeout = window.setTimeout(() => {
      if (cancelled) return;
      setReady((r) => {
        if (!r) setLinkError("This reset link is invalid or has expired. Request a new one.");
        return r;
      });
    }, 3000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ password, confirm });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your password and try again.");
      return;
    }
    setPending(true);
    const result = await updatePassword(parsed.data.password);
    setPending(false);
    if (result.error) {
      setError(result.error.message || "Couldn't update password. Please try again.");
      return;
    }
    setDone(true);
    window.setTimeout(() => {
      navigate({ to: "/dashboard" });
    }, 1200);
  };

  return (
    <MarketingLayout>
      <section className="mx-auto w-full max-w-md px-5 pt-20 pb-24 md:pt-28">
        <p className="eyebrow">The Get</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">
          Choose a new password.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Pick something memorable but private. You'll be signed in once it's saved.
        </p>

        {linkError ? (
          <div className="mt-10 space-y-4">
            <div className="border border-destructive/50 p-6 text-sm text-destructive">
              {linkError}
            </div>
            <Link
              to="/forgot-password"
              className="inline-flex h-12 w-full items-center justify-center border border-foreground bg-foreground px-6 text-[12px] uppercase tracking-[0.18em] text-background transition-opacity hover:opacity-90"
            >
              Request a new link
            </Link>
          </div>
        ) : done ? (
          <div className="mt-10 border border-foreground p-6">
            <p className="text-sm text-foreground">Password updated. Taking you in…</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-10 space-y-3" noValidate>
            <label className="block">
              <span className="sr-only">New password</span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (8+ characters)"
                disabled={pending || !ready}
                className="h-12 w-full border border-foreground bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-60"
              />
            </label>
            <label className="block">
              <span className="sr-only">Confirm new password</span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                disabled={pending || !ready}
                className="h-12 w-full border border-foreground bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-60"
              />
            </label>
            <button
              type="submit"
              disabled={pending || !ready}
              className="inline-flex h-12 w-full items-center justify-center border border-foreground bg-foreground px-6 text-[12px] uppercase tracking-[0.18em] text-background transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Saving…" : ready ? "Save new password" : "Verifying link…"}
            </button>
          </form>
        )}

        {error && (
          <p className="mt-4 text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
      </section>
    </MarketingLayout>
  );
}
