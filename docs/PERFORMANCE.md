# Performance findings — The Get

Static audit only. No runtime profiling, no flamegraphs. File:line links are
clickable from any editor at the repo root. Ordered roughly by likely impact
on time-to-interactive and Cloudflare Workers cold start.

## 1. Scope & methodology

Read-only review of the auth boot path, router wiring, route loaders,
`__root.tsx`, `package.json`, and the Supabase client. Recommendations below
are hypotheses to validate with a real profiler (Chrome DevTools Performance,
`browser--performance_profile`) before investing in fixes.

## 2. Auth subscription fan-out (high)

[src/lib/auth.ts](../src/lib/auth.ts) — `useAuth()` opens its own
`supabase.auth.onAuthStateChange` + `getSession()` on every consumer.
Current callers: `PageLayout`, `admin/UsersRolesTab`, `use-is-admin`,
`marketing/MarketingNav`, `use-profile`, plus the router itself in
[src/router.tsx](../src/router.tsx). That's ~6 duplicate subscriptions firing
on first paint, each doing its own session round-trip and re-render.

**Fix:** module-scoped store (Zustand, or a hand-rolled `useSyncExternalStore`)
seeded once from the router context. Every `useAuth()` becomes a cheap
selector instead of a Supabase subscription.

## 3. Double invalidation on boot (high)

[src/router.tsx](../src/router.tsx) — both `supabase.auth.getSession()` and
the `INITIAL_SESSION` event from `onAuthStateChange` call `apply()`. Each
call runs `queryClient.invalidateQueries()` + `router.invalidate()`. So
every query on the page is invalidated and refetched twice on first load.

**Fix:** drop the manual `getSession()` and rely on the `INITIAL_SESSION`
event that `onAuthStateChange` always fires on subscribe.

## 4. SSR auth gap (medium, long-term)

[src/router.tsx](../src/router.tsx) initial auth state is `loading`, and
[src/routes/_authenticated.tsx](../src/routes/_authenticated.tsx) renders the
`HydratingShell` skeleton for up to 1.8s by design. The skeleton is fine, but
it means authenticated routes never SSR real content — the user always sees
a placeholder first.

**Fix is architectural, not a quick win:** real auth-aware SSR requires
switching Supabase auth from `localStorage` to cookie storage and forwarding
the session cookie at render time. Park this until the rest of the list is
done.

## 5. Loader does not await its prefetches (medium)

[src/routes/_authenticated/dashboard.tsx](../src/routes/_authenticated/dashboard.tsx)
fires three `ensureQueryData` calls **without** `await` or `Promise.all`.
The calls themselves run in parallel — that part is fine — but the loader
returns synchronously, so the route mounts before any of the data has
landed. Every `useSuspenseQuery` in the component then suspends, and the
user sees the route-level fallback instead of a fully-painted page.

**Fix:** `return Promise.all([...ensureQueryData(...)])` in the loader so
TanStack Router waits for the data before mounting the component.

## 6. Bundle surface + Workers cold start (medium)

[package.json](../package.json) ships 27 `@radix-ui/*` packages plus
`recharts`, `embla-carousel-react`, `vaul`, `cmdk`, `input-otp`,
`react-day-picker`, and the full `lucide-react` icon set. Each unused
dependency inflates the Cloudflare Workers isolate's parse cost on cold
start and bloats the client bundle.

**Fix:** audit imports (`bunx knip` or `bunx depcheck`) and remove anything
unused. For `lucide-react`, prefer per-icon imports
(`lucide-react/icons/<name>`) to defeat the barrel.

## 7. Render-blocking fonts (low-medium)

[src/routes/__root.tsx](../src/routes/__root.tsx) loads Google Fonts via a
blocking `<link rel="stylesheet">`. `preconnect` is already in place, which
helps, but the stylesheet itself still blocks first paint.

**Fix:** either self-host the woff2 files with `font-display: swap`, or load
the Google stylesheet with `media="print" onload="this.media='all'"` to
make it non-blocking.

## 8. Prioritized next steps

1. Consolidate auth into a module-scoped store (§2)
2. De-dupe boot `apply()` (§3) — small, low-risk
3. Return `Promise.all(...)` from dashboard loader (§5) — one-line change
4. Bundle audit (§6)
5. Fix font loading (§7)
6. Revisit SSR auth (§4) only after the above
