import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { GoogleAuthCard } from "@/components/marketing/GoogleAuthCard";
import { safeRedirect } from "@/lib/safeRedirect";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: ({ context, search }) => {
    if (context.auth?.status === "authenticated") {
      throw redirect({ to: safeRedirect(search.redirect, "/dashboard") });
    }
  },
  head: () => ({
    meta: [
      { title: "Sign in — The Get" },
      { name: "description", content: "Continue with Google to pick up where you left off." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect: redirectTo } = Route.useSearch();
  return (
    <MarketingLayout>
      <GoogleAuthCard
        mode="signin"
        heading="Sign in."
        supporting="Continue with Google, Apple, or email to pick up where you left off."
        redirectTo={redirectTo}
        footer={
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Forgot your password?{" "}
              <Link to="/forgot-password" className="text-foreground underline underline-offset-4 hover:opacity-70">
                Reset it
              </Link>
            </p>
            <p>
              New here?{" "}
              <Link
                to="/signup"
                search={redirectTo ? { redirect: redirectTo } : undefined}
                className="text-foreground underline underline-offset-4 hover:opacity-70"
              >
                Create your signal
              </Link>
            </p>
          </div>
        }
      />
    </MarketingLayout>
  );
}
