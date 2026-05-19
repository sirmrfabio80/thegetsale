import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth, signOut } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav />
      <main className="mx-auto w-full max-w-5xl px-5 md:px-10">{children}</main>
      <Footer />
    </div>
  );
}

function TopNav() {
  const auth = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4 md:px-10">
        <Link to="/" className="font-serif text-2xl leading-none tracking-tight">
          The Get
        </Link>
        <nav className="flex items-center gap-1 text-[12px]">
          <NavLink to="/dashboard">Signals</NavLink>
          <NavLink to="/watchlist">Watchlist</NavLink>
          {auth.status === "authenticated" && (
            <DropdownMenu>
              <DropdownMenuTrigger className="ml-2 inline-flex h-9 items-center gap-2 border border-border px-3 text-[11px] uppercase tracking-[0.18em] text-foreground transition-colors hover:border-foreground">
                <span aria-hidden className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[10px] uppercase text-background">
                  {(auth.displayName ?? auth.email ?? "?").slice(0, 1)}
                </span>
                <span className="hidden max-w-[160px] truncate normal-case tracking-normal sm:inline">
                  {auth.displayName ?? auth.email}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[220px]">
                <DropdownMenuLabel className="text-[11px] font-normal uppercase tracking-[0.18em] text-muted-foreground">
                  Signed in as
                </DropdownMenuLabel>
                <DropdownMenuLabel className="pt-0 text-sm font-normal text-foreground">
                  {auth.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
      activeProps={{ className: "px-3 py-2 text-foreground" }}
    >
      {children}
    </Link>
  );
}

function Footer() {
  return (
    <footer className="mx-auto mt-24 w-full max-w-5xl px-5 pb-12 md:px-10">
      <div className="hairline mb-6" />
      <div className="flex flex-col items-start justify-between gap-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground md:flex-row md:items-center">
        <span className="font-serif text-base normal-case tracking-normal text-foreground">
          The Get
        </span>
        <span>A quieter way to buy. Prototype, mock data.</span>
      </div>
    </footer>
  );
}

export function SectionRule({ label }: { label?: string }) {
  return (
    <div className="my-10 flex items-center gap-4">
      <div className="hairline flex-1" />
      {label && <span className="eyebrow">{label}</span>}
      <div className="hairline flex-1" />
    </div>
  );
}
