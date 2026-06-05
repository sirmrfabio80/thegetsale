import { useRouter } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";

type Props = {
  /** Short editorial label above the headline (eyebrow style). */
  eyebrow?: string;
  /** Headline. Defaults to a calm fallback. */
  title?: string;
  /** Raw error to derive a friendly message from. */
  error?: Error;
  /** Optional override for the message body. */
  message?: string;
  /** Boundary reset from TanStack Router. */
  reset: () => void;
  /** Retry button copy. */
  retryLabel?: string;
};

/**
 * Maps raw error messages to calm, editorial copy that fits the product
 * voice. Falls back to the original message for unknown shapes so we never
 * silently hide a real failure.
 */
function friendlyMessage(error?: Error): string {
  const raw = error?.message?.trim() ?? "";
  if (!raw) return "Something interrupted the read. Try again in a moment.";

  // Network / transport
  if (/Failed to fetch|NetworkError|ERR_NETWORK|load failed/i.test(raw)) {
    return "We couldn't reach the signal desk. Check your connection and try again.";
  }
  // Timeouts
  if (/timeout|timed out|ETIMEDOUT/i.test(raw)) {
    return "That took longer than expected. Try once more.";
  }
  // Auth-shaped
  if (/Unauthorized|JWT|AuthSession|Invalid token|Invalid Refresh Token/i.test(raw)) {
    return "Your session needs a refresh. Try again to continue.";
  }
  // Server
  if (/\b5\d\d\b|Internal Server Error|Bad Gateway|Service Unavailable/i.test(raw)) {
    return "The signal desk is catching its breath. One more try should do it.";
  }
  return raw;
}

/**
 * Shared loader-error UI for the brand, dashboard, and watchlist routes.
 * Renders inside `<PageLayout>` so the page chrome (nav/footer) survives the
 * failure and the root error overlay never takes over.
 */
export function RouteErrorCard({
  eyebrow = "Couldn't load this page",
  title,
  error,
  message,
  reset,
  retryLabel = "Try again",
}: Props) {
  const router = useRouter();
  const body = message ?? friendlyMessage(error);

  return (
    <PageLayout>
      <section
        role="alert"
        aria-live="polite"
        className="mx-auto max-w-md py-24 text-center"
      >
        <p className="eyebrow text-muted-foreground">{eyebrow}</p>
        {title && (
          <h1 className="mt-3 font-serif text-3xl leading-snug text-foreground">
            {title}
          </h1>
        )}
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
        <button
          type="button"
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 inline-flex h-10 items-center border border-foreground px-4 text-[11px] uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          autoFocus
        >
          {retryLabel}
        </button>
      </section>
    </PageLayout>
  );
}
