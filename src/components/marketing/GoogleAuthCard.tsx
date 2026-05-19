import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import {
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  type OAuthResult,
} from "@/lib/auth";

type Mode = "signup" | "signin";

type Props = {
  heading: string;
  supporting: string;
  buttonLabel?: string;
  footer?: React.ReactNode;
  mode?: Mode;
  redirectTo?: string;
};

type Pending = "google" | "apple" | "email" | null;

const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(72, "Keep it under 72 characters"),
});

export function GoogleAuthCard({
  heading,
  supporting,
  buttonLabel = "Continue with Google",
  footer,
  mode = "signup",
  redirectTo,
}: Props) {
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const goAfterAuth = () => {
    if (redirectTo) {
      navigate({ to: "/auth/callback", search: { redirect: redirectTo } });
    } else {
      navigate({ to: "/auth/callback" });
    }
  };

  const run = async (
    provider: "google" | "apple",
    fn: (redirectTo?: string) => Promise<OAuthResult>,
  ) => {
    setError(null);
    setNotice(null);
    setPending(provider);
    try {
      const result = await fn(redirectTo);
      if (result.error) {
        setError(result.error.message || "Couldn't start sign-in. Please try again.");
        setPending(null);
        return;
      }
      if (result.authenticated) {
        goAfterAuth();
        return;
      }
      // result.redirected === true: browser is navigating to the provider; keep spinner.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setPending(null);
    }
  };

  const onEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your details and try again.");
      return;
    }
    setPending("email");
    const result =
      mode === "signup"
        ? await signUpWithEmail(parsed.data.email, parsed.data.password, redirectTo)
        : await signInWithEmail(parsed.data.email, parsed.data.password);
    if (result.error) {
      const msg = result.error.message;
      setError(
        /invalid login credentials/i.test(msg)
          ? "Those details didn't match. Try again or use Google/Apple."
          : /already registered|user already/i.test(msg)
          ? "An account with that email already exists. Sign in instead."
          : msg || "Couldn't complete sign-in.",
      );
      setPending(null);
      return;
    }
    if (result.needsVerification) {
      setNotice("Check your inbox to confirm your email, then sign in.");
      setPassword("");
      setPending(null);
      return;
    }
    if (result.authenticated) {
      goAfterAuth();
      return;
    }
    setPending(null);
  };

  const busy = pending !== null;
  const emailLabel =
    pending === "email"
      ? mode === "signup"
        ? "Creating account…"
        : "Signing in…"
      : mode === "signup"
      ? "Create account"
      : "Sign in";

  return (
    <section className="mx-auto w-full max-w-md px-5 pt-20 pb-24 md:pt-28">
      <p className="eyebrow">The Get</p>
      <h1 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">{heading}</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{supporting}</p>

      <button
        type="button"
        onClick={() => run("google", signInWithGoogle)}
        disabled={busy}
        className="mt-10 inline-flex h-12 w-full items-center justify-center gap-3 border border-foreground bg-foreground px-6 text-[12px] uppercase tracking-[0.18em] text-background transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <GoogleGlyph />
        {pending === "google" ? "Connecting…" : buttonLabel}
      </button>

      <button
        type="button"
        onClick={() => run("apple", signInWithApple)}
        disabled={busy}
        className="mt-3 inline-flex h-12 w-full items-center justify-center gap-3 border border-foreground bg-background px-6 text-[12px] uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-60"
      >
        <AppleGlyph />
        {pending === "apple" ? "Connecting…" : "Continue with Apple"}
      </button>

      <div className="my-8 flex items-center gap-4 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or with email
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onEmailSubmit} className="space-y-3" noValidate>
        <label className="block">
          <span className="sr-only">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={busy}
            className="h-12 w-full border border-foreground bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-60"
          />
        </label>
        <label className="block">
          <span className="sr-only">Password</span>
          <input
            type="password"
            required
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "Create a password (8+ characters)" : "Your password"}
            disabled={busy}
            className="h-12 w-full border border-foreground bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-60"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-12 w-full items-center justify-center border border-foreground bg-background px-6 text-[12px] uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-60"
        >
          {emailLabel}
        </button>
      </form>

      {error && (
        <p className="mt-4 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-4 text-xs text-foreground" role="status">
          {notice}
        </p>
      )}

      <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        We only ask for your name and email.
      </p>

      {footer && <div className="mt-10">{footer}</div>}
    </section>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden className="shrink-0">
      <path fill="#fff" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.71-1.57 2.7-3.9 2.7-6.62z" />
      <path fill="#fff" opacity="0.85" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.93v2.32A9 9 0 009 18z" />
      <path fill="#fff" opacity="0.7" d="M3.97 10.72A5.4 5.4 0 013.68 9c0-.6.1-1.18.29-1.72V4.96H.93A9 9 0 000 9c0 1.45.35 2.83.93 4.04l3.04-2.32z" />
      <path fill="#fff" opacity="0.55" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 00.93 4.96L3.97 7.28C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden className="shrink-0">
      <path
        fill="currentColor"
        d="M11.36 8.46c-.02-2.05 1.68-3.04 1.76-3.09-.96-1.4-2.45-1.59-2.98-1.61-1.27-.13-2.48.74-3.13.74-.65 0-1.65-.72-2.71-.7-1.39.02-2.68.81-3.4 2.05-1.45 2.52-.37 6.24 1.04 8.28.69 1 1.51 2.12 2.59 2.08 1.04-.04 1.43-.67 2.69-.67 1.25 0 1.6.67 2.7.65 1.12-.02 1.82-1.01 2.5-2.02.79-1.16 1.11-2.29 1.13-2.35-.02-.01-2.17-.83-2.19-3.29zM9.31 2.43C9.88 1.74 10.27.78 10.16-.18c-.82.03-1.81.55-2.4 1.23-.53.61-1 1.59-.87 2.52.92.07 1.85-.47 2.42-1.14z"
      />
    </svg>
  );
}
