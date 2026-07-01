import { createFileRoute, redirect } from "@tanstack/react-router";

// Temporary safety net: forward any unknown /auth/* path (and bare /auth)
// to /login instead of falling through to the root 404. More specific
// routes like /auth/callback take precedence over this splat.
export const Route = createFileRoute("/auth/$")({
  beforeLoad: () => {
    throw redirect({ to: "/login", replace: true });
  },
});
