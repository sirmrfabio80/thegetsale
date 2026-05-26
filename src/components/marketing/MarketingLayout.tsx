import type { ReactNode } from "react";
import { MarketingNav } from "./MarketingNav";

export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}

function MarketingFooter() {
  return (
    <footer className="mx-auto mt-24 w-full max-w-6xl px-5 pb-12 md:px-10">
      <div className="hairline mb-6" />
      <div className="flex flex-col items-start justify-between gap-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground md:flex-row md:items-center">
        <span className="font-serif text-base normal-case tracking-normal text-foreground">
          The Get
        </span>
        <span className="flex flex-col gap-1 md:items-end">
          <span>A quieter way to buy. Prototype, mock data.</span>
          <a
            href="https://logo.dev"
            className="normal-case tracking-normal text-muted-foreground hover:text-foreground"
          >
            Logos provided by Logo.dev
          </a>
        </span>
      </div>
    </footer>
  );
}
