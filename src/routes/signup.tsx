import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { signIn } from "@/lib/auth";

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: ({ context, search }) => {
    if (context.auth?.isAuthenticated) {
      throw redirect({ to: search.redirect ?? "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Create your signal — The Get" },
      { name: "description", content: "Start with the houses you already watch." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    signIn(email.trim());
    navigate({ to: "/setup" });
  };

  return (
    <MarketingLayout>
      <section className="mx-auto w-full max-w-md px-5 pt-20 pb-24 md:pt-28">
        <p className="eyebrow">Begin quietly</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">
          Create your signal.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Tell us the houses you watch. We'll do the listening.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          <Field label="Email" type="email" value={email} onChange={setEmail} autoFocus required />
          <Field label="Password" type="password" value={password} onChange={setPassword} />
          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center border border-foreground bg-foreground px-6 text-[12px] uppercase tracking-[0.18em] text-background transition-opacity hover:opacity-90"
          >
            Create your signal
          </button>
        </form>

        <p className="mt-8 text-sm text-muted-foreground">
          Already with us?{" "}
          <Link to="/login" className="text-foreground underline underline-offset-4 hover:opacity-70">
            Sign in
          </Link>
        </p>
      </section>
    </MarketingLayout>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoFocus,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        required={required}
        className="mt-2 block h-12 w-full border border-border bg-transparent px-3 text-sm text-foreground focus:border-foreground focus:outline-none"
      />
    </label>
  );
}
