import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
// Toasts disabled app-wide — Toaster intentionally not mounted.

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-3 font-serif text-4xl text-foreground">Page not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The page you're looking for has moved or never existed.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center border border-foreground px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-foreground hover:text-background"
          >
            Back to The Get
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-3 font-serif text-3xl text-foreground">This page didn't load</h1>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="border border-foreground px-5 py-2.5 text-xs uppercase tracking-[0.18em] hover:bg-foreground hover:text-background"
          >
            Try again
          </button>
          <a href="/" className="border border-border px-5 py-2.5 text-xs uppercase tracking-[0.18em] hover:border-foreground">
            Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient; auth: { status: "loading" | "authenticated" | "unauthenticated"; user: import("@supabase/supabase-js").User | null } }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "The Get" },
      { name: "description", content: "Lorem ipsum" },
      { property: "og:title", content: "The Get" },
      { property: "og:description", content: "Lorem ipsum" },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "The Get" },
      { name: "twitter:description", content: "Lorem ipsum" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7798c1b3-7400-44e9-a4e5-3bb999ce5944/id-preview-f98e8dfc--ba1e041c-74b2-4a5d-a81e-04bf1398a6ce.lovable.app-1779293092950.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7798c1b3-7400-44e9-a4e5-3bb999ce5944/id-preview-f98e8dfc--ba1e041c-74b2-4a5d-a81e-04bf1398a6ce.lovable.app-1779293092950.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    ],
    scripts: [
      {
        // Non-blocking Google Fonts load. Injected client-side so the
        // stylesheet never blocks first paint; system fallbacks in
        // styles.css cover the swap window.
        children:
          "var l=document.createElement('link');" +
          "l.rel='stylesheet';" +
          "l.href='https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap';" +
          "l.media='print';" +
          "l.onload=function(){l.media='all'};" +
          "document.head.appendChild(l);",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
