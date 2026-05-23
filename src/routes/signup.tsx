import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { GoogleAuthCard } from "@/components/marketing/GoogleAuthCard";
import { safeRedirect } from "@/lib/safeRedirect";
import { usePrivateBeta } from "@/hooks/use-private-beta";

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === "string" ? { redirect: search.redirect } : {},
  beforeLoad: ({ context, search }) => {
    if (context.auth?.status === "authenticated") {
      throw redirect({ to: safeRedirect(search.redirect, "/dashboard") });
    }
  },
  head: () => ({
    meta: [
      { title: "Create your signal — The Get" },
      { name: "description", content: "Sign in with Google to follow houses, save pieces, and receive sharper buy/wait signals." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { redirect: redirectTo } = Route.useSearch();
  const { enabled: privateBeta, isLoading } = usePrivateBeta();

  if (isLoading) {
    return (
      <MarketingLayout>
        <section className="mx-auto w-full max-w-md px-5 pt-20 pb-24 md:pt-28">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </section>
      </MarketingLayout>
    );
  }

  if (privateBeta) {
    return (
      <MarketingLayout>
        <section className="mx-auto w-full max-w-md px-5 pt-20 pb-24 md:pt-28">
          <p className="eyebrow">The Get</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">
            Private beta.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            New signups are paused while we shape the first signals carefully.
            If you already have an account, sign in below.
          </p>
          <Link
            to="/login"
            search={redirectTo ? { redirect: redirectTo } : undefined}
            className="mt-10 inline-flex h-12 items-center justify-center border border-foreground bg-foreground px-6 text-[12px] uppercase tracking-[0.18em] text-background transition-opacity hover:opacity-90"
          >
            Sign in
          </Link>
        </section>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <GoogleAuthCard
        mode="signup"
        heading="Create your private signal."
        supporting="Sign up with Google, Apple, or email to follow houses, save pieces, and receive sharper buy/wait signals."
        redirectTo={redirectTo}
        footer={
          <p className="text-sm text-muted-foreground">
            Already with us?{" "}
            <Link
              to="/login"
              search={redirectTo ? { redirect: redirectTo } : undefined}
              className="text-foreground underline underline-offset-4 hover:opacity-70"
            >
              Sign in
            </Link>
          </p>
        }
      />
    </MarketingLayout>
  );
}
