import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { GoogleAuthCard } from "@/components/marketing/GoogleAuthCard";

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: ({ context, search }) => {
    if (context.auth?.status === "authenticated") {
      throw redirect({ to: search.redirect ?? "/dashboard" });
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
  return (
    <MarketingLayout>
      <GoogleAuthCard
        heading="Create your private signal."
        supporting="Sign in with Google to follow houses, save pieces, and receive sharper buy/wait signals."
        footer={
          <p className="text-sm text-muted-foreground">
            Already with us?{" "}
            <Link to="/login" className="text-foreground underline underline-offset-4 hover:opacity-70">
              Sign in
            </Link>
          </p>
        }
      />
    </MarketingLayout>
  );
}
