import { useState } from "react";
import { signInWithGoogle } from "@/lib/auth";

type Props = {
  heading: string;
  supporting: string;
  buttonLabel?: string;
  footer?: React.ReactNode;
};

export function GoogleAuthCard({ heading, supporting, buttonLabel = "Continue with Google", footer }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // On success the broker redirects; no further work here.
  };

  return (
    <section className="mx-auto w-full max-w-md px-5 pt-20 pb-24 md:pt-28">
      <p className="eyebrow">The Get</p>
      <h1 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">{heading}</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{supporting}</p>

      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="mt-10 inline-flex h-12 w-full items-center justify-center gap-3 border border-foreground bg-foreground px-6 text-[12px] uppercase tracking-[0.18em] text-background transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <GoogleGlyph />
        {loading ? "Connecting…" : buttonLabel}
      </button>

      {error && (
        <p className="mt-4 text-xs text-destructive">{error}</p>
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
      <path
        fill="#fff"
        d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.71-1.57 2.7-3.9 2.7-6.62z"
      />
      <path
        fill="#fff"
        opacity="0.85"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.93v2.32A9 9 0 009 18z"
      />
      <path
        fill="#fff"
        opacity="0.7"
        d="M3.97 10.72A5.4 5.4 0 013.68 9c0-.6.1-1.18.29-1.72V4.96H.93A9 9 0 000 9c0 1.45.35 2.83.93 4.04l3.04-2.32z"
      />
      <path
        fill="#fff"
        opacity="0.55"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 00.93 4.96L3.97 7.28C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
