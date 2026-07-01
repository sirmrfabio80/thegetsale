import { Link } from "@tanstack/react-router";
import { useAuth, signOut } from "@/lib/auth";
import { usePrivateBeta } from "@/hooks/use-private-beta";

export function MarketingNav() {
  const auth = useAuth();
  const { enabled: privateBeta } = usePrivateBeta();

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-4 md:px-10">
        <Link
          to={auth.status === "authenticated" ? "/dashboard" : "/"}
          className="font-serif text-2xl leading-none tracking-tight"
        >
          The Get
        </Link>

        <nav className="flex items-center gap-2 md:gap-3">
          {auth.status === "authenticated" ? (
            <>
              <button
                onClick={() => signOut()}
                className="hidden h-11 items-center px-3 text-[12px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
              >
                Sign out
              </button>
              <Link
                to="/dashboard"
                className="inline-flex h-11 items-center border border-foreground bg-foreground px-4 text-[11px] uppercase tracking-[0.18em] text-background transition-opacity hover:opacity-90 md:px-5"
              >
                Open the app
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="inline-flex h-11 items-center px-3 text-[12px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
              {!privateBeta && (
                <Link
                  to="/signup"
                  className="inline-flex h-11 items-center border border-foreground bg-foreground px-4 text-[11px] uppercase tracking-[0.18em] text-background transition-opacity hover:opacity-90 md:px-5"
                >
                  Sign up
                </Link>
              )}

            </>
          )}
        </nav>
      </div>
    </header>
  );
}
