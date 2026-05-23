import { useEffect } from "react";
import {
  createFileRoute,
  Outlet,
  Link,
  redirect,
  isRedirect,
  useNavigate,
} from "@tanstack/react-router";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { getMyAdminStatus } from "@/lib/admin.functions";
import { PageLayout } from "@/components/PageLayout";

export const Route = createFileRoute("/_authenticated/_admin")({
  beforeLoad: async () => {
    try {
      const { isAdmin } = await getMyAdminStatus();
      if (!isAdmin) {
        throw redirect({ to: "/dashboard" });
      }
    } catch (e) {
      if (isRedirect(e)) throw e;
      // Fail closed: if we can't verify admin status, send to dashboard.
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { data, isLoading } = useIsAdmin();
  const navigate = useNavigate();

  const denied = !isLoading && data?.isAdmin === false;

  useEffect(() => {
    if (!denied) return;
    const t = setTimeout(() => {
      navigate({ to: "/dashboard", replace: true });
    }, 1600);
    return () => clearTimeout(t);
  }, [denied, navigate]);

  if (isLoading) {
    return (
      <PageLayout>
        <section className="pt-16 md:pt-24">
          <p className="eyebrow text-muted-foreground">Admin</p>
          <p className="mt-4 text-sm text-muted-foreground">Checking access…</p>
        </section>
      </PageLayout>
    );
  }

  if (denied) {
    return (
      <PageLayout>
        <section className="pt-16 md:pt-24">
          <p className="eyebrow">Admin</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">Not for you.</h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            This area is reserved for editors of The Get.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Redirecting to your dashboard…</p>
          <div className="mt-6">
            <Link
              to="/dashboard"
              className="inline-flex h-11 items-center border border-foreground px-5 text-[11px] uppercase tracking-[0.18em] hover:bg-foreground hover:text-background"
            >
              Back to signals
            </Link>
          </div>
        </section>
      </PageLayout>
    );
  }

  return <Outlet />;
}
