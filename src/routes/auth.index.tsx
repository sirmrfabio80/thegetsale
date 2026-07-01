import { createFileRoute, redirect } from "@tanstack/react-router";

// Bare /auth → /login
export const Route = createFileRoute("/auth/")({
  beforeLoad: () => {
    throw redirect({ to: "/login", replace: true });
  },
});
