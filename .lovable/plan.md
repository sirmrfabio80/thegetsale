
# Memory investigation + profile route fix — The Get

## What the screenshots show

1. **Dashboard reload (Safari)** — "This web page was reloaded because it was using significant memory." Safari's per-tab memory guard. Fires when a tab's footprint grows past Safari's threshold over time, not because a single render is doing something catastrophic.
2. **Profile page (`/profile`)** — branded `__root.tsx` `ErrorComponent` ("This page didn't load") instead of the actual profile. The route is throwing during `beforeLoad`/loader, the root error boundary catches it, and the user sees the generic fallback.

Both URLs are `preview--thegetsale.lovable.app` — the **deployed preview**, not local Vite dev. The runtime error `Failed to fetch dynamically imported module: virtual:tanstack-start-client-entry` is the classic symptom of Safari evicting the tab and then trying to re-import chunks from a build that has since been replaced. It is a consequence of the reload, not the cause.

## Likely contributors to memory — ranked by suspicion

### 1. Double `onAuthStateChange` subscription with full query-cache invalidation (high)

`src/router.tsx:39` and `src/lib/auth.ts:95` both call `supabase.auth.onAuthStateChange`. Every auth event (INITIAL_SESSION, TOKEN_REFRESHED — roughly hourly and on every focus/visibility regain) triggers in the router branch:

- `queryClient.invalidateQueries()` over **every** query in the cache
- `router.invalidate()` (refetches every active route loader)

`PERFORMANCE.md §2/§3` already flagged this. The auth store fix landed; the router-side duplicate is still there. On a long-lived tab, that's a steady stream of refetches, new response objects retained in the query cache, and re-rendered React trees — exactly the shape that pushes Safari over its ceiling.

### 2. Query cache with no `defaultOptions` (high)

`getRouter()` creates a `QueryClient` with no defaults and sets `defaultPreloadStaleTime: 0` on the router. Effects:

- `gcTime` defaults to 5 minutes, but on a backgrounded Safari tab timers throttle — cached responses linger far longer than expected.
- `defaultPreloadStaleTime: 0` means every link-hover prefetch is instantly stale, so the actual navigation refetches even though data just arrived. Each refetch creates a new response object and keeps the previous one around until React unmounts the consumer.
- Combined with §1, every TOKEN_REFRESHED re-runs `listHousesForDashboard`, `watchlistQueryOptions`, `setupQueryOptions`, etc., and retains the prior payloads.

### 3. `lucide-react` barrel import (medium)

`package.json` pulls all of `lucide-react` (~1100 icons). Production builds tree-shake per-icon, but the dev/preview build ships more eagerly and the parsed-but-unused modules sit in memory, inflating baseline heap.

### 4. 27 Radix packages + `vaul` + `tw-animate-css` (medium)

Anything actually rendered (Dialog, Select, Dropdown, Tooltip, Popover, ScrollArea) brings Radix runtime + Floating UI state. Several admin and setup screens mount multiple primitives simultaneously, and Radix portals can retain detached DOM after route transitions if a popover was open during navigation.

### 5. `lib/error-capture.ts` global listeners (low)

`globalThis.addEventListener("error", …)` and `unhandledrejection` registered at module scope, never removed. Single-slot, 5s TTL — not a growing list, but flagging it as one of the few persistent globals.

### 6. Lovable preview iframe overhead (informational)

Safari accounts iframe memory against the parent tab. Part of the "significant memory" reading is the Lovable preview chrome itself, not The Get. The same app at a custom domain reports noticeably less. Outside our control — investigation here targets the app's own heap.

## What's wrong with `/profile`

`src/routes/_authenticated/profile.tsx` has its own `beforeLoad`:

```ts
beforeLoad: async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw redirect({ to: "/login" });
}
```

Three problems:

1. **It's redundant.** The parent `_authenticated.tsx` layout already gates on `context.auth.status`. This second check duplicates the gate and adds a network round-trip on every navigation into `/profile`.
2. **It runs during SSR.** Profile is under `_authenticated/`, but `_authenticated.tsx` only filters by `context.auth` (which is `"loading"` during SSR — it does NOT throw during SSR, it just lets the layout render `HydratingShell`). The profile's `beforeLoad` then fires `supabase.auth.getUser()` on the server with no session, returns `{ data: { user: null }, error: ... }`, and throws `redirect({ to: "/login" })`. If the redirect resolves cleanly it's silent — but any failure mode (network blip, transient Supabase error, the redirect throw being swallowed by an unrelated try/catch upstream) surfaces as a thrown error and the root `errorComponent` renders "This page didn't load".
3. **Other authenticated routes don't do this.** `dashboard.tsx`, `watchlist.tsx`, `setup.tsx`, etc. rely on the parent layout gate only. Profile is the odd one out, and it's the only route currently showing the error.

The fix is to delete the `beforeLoad` on the profile route and rely on `_authenticated.tsx` like every other protected page. The `useProfile()` query inside the component already handles the authenticated/unauthenticated split via `enabled: auth.status === "authenticated"`, so removing the gate doesn't expose anything to anonymous users.

## What to verify before fixing memory

Diagnostic steps to run before any code change so we don't fix the wrong thing:

1. **Heap snapshot in Safari.** Sit on `/dashboard` for 2 minutes, then dashboard → watchlist → brand detail → back, 3×. A growing heap across identical navigations confirms a leak; flat-but-high points to baseline bloat.
2. **Query cache count** at idle vs after 5 minutes. If it grows, §1+§2 confirmed.
3. **Detached DOM** in Heap Snapshot → filter "Detached". High count = Radix portal cleanup issue.
4. **Reproduce in Chrome.** Chrome's DevTools Performance Monitor shows JS heap trend. If Chrome stays flat and Safari grows, it's Safari background-tab throttling + query refetch storm.

## Proposed fixes (ordered, smallest first)

1. **Remove the duplicate `beforeLoad` on `/_authenticated/profile`.** Delete the block; keep `errorComponent` and `pendingComponent`. This is the profile error fix and is independent of the memory work.
2. **Remove the duplicate auth subscription in `src/router.tsx`.** The module-scoped store in `src/lib/auth.ts` already handles auth state. Drive router context off the same store instead of opening a second `onAuthStateChange`. Kills the full-cache invalidation on every TOKEN_REFRESHED.
3. **Tighten `QueryClient` defaults.** In `getRouter()`:
   ```ts
   new QueryClient({
     defaultOptions: {
       queries: {
         staleTime: 60_000,
         gcTime: 5 * 60_000,
         refetchOnWindowFocus: false,
       },
     },
   })
   ```
   and raise `defaultPreloadStaleTime` to e.g. `30_000` so hover prefetches aren't instantly thrown away.
4. **Audit `lucide-react` usage.** Either switch hot paths to per-icon imports or run `bunx knip`; if <50 distinct icons used, per-icon imports are a clear win.
5. **Verify Radix portal cleanup** on routes that open menus/popovers (admin, profile, setup). Confirm open popovers close before route navigation, or rely on `<Outlet />` unmount. Detached-DOM count from step 3 above tells us if this is real.
6. **(Optional) Drop unused Radix packages** via `bunx depcheck`. Trims install size, doesn't directly reduce runtime memory; lowest priority.

## What this plan does NOT change

- No product, routing, terminology, or UX changes.
- No backend or RLS changes.
- No new dependencies.
- The Lovable preview iframe overhead is outside our control.

## Deliverable order if approved

1. Land fix #1 (profile `beforeLoad` removal) — smallest, fixes the visible error immediately, zero risk to other routes.
2. Run the verification steps and report which memory contributors are confirmed.
3. Land fix #2 (router auth dedupe) — most likely single-cause win for memory, low risk.
4. Land fix #3 (QueryClient defaults).
5. Re-measure. Only proceed to #4–#6 if memory is still elevated.
