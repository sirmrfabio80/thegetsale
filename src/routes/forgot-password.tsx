import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { requestPasswordReset } from "@/lib/auth";

export const Route = createFileRoute("/forgot-password")({
  beforeLoad: ({ context }) => {
    if (context.auth?.status === "authenticated") {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Reset your password — The Get" },
      { name: "description", content: "We'll send you a link to set a new password." },
    ],
  }),
  component: ForgotPasswordPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your email and try again.");
      return;
    }
    setPending(true);
    const result = await requestPasswordReset(parsed.data.email);
    setPending(false);
    if (result.error) {
      setError(result.error.message || "Couldn't send reset email. Please try again.");
      return;
    }
    setSent(true);
  };

  return (
    <MarketingLayout>
      <section className="mx-auto w-full max-w-md px-5 pt-20 pb-24 md:pt-28">
        <p className="eyebrow">The Get</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">Reset your password.</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Enter the email you signed up with and we'll send a link to set a new password.
        </p>

        {sent ? (
          <div className="mt-10 border border-foreground p-6">
            <p className="text-sm text-foreground">
              If an account exists for <span className="font-medium">{email}</span>, a reset link is
              on its way. Check your inbox.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-10 space-y-3" noValidate>
            <label className="block">
              <span className="sr-only">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={pending}
                className="h-12 w-full border border-foreground bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-60"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-12 w-full items-center justify-center border border-foreground bg-foreground px-6 text-[12px] uppercase tracking-[0.18em] text-background transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        {error && (
          <p className="mt-4 text-xs text-destructive" role="alert">
            {error}
          </p>
        )}

        <p className="mt-10 text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link
            to="/login"
            className="text-foreground underline underline-offset-4 hover:opacity-70"
          >
            Back to sign in
          </Link>
        </p>
      </section>
    </MarketingLayout>
  );
}
