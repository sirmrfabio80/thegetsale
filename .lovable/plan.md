# Fix loader-error overlays — revised

Both screenshots are loader-error UIs (root `errorComponent` over a View-Transition snapshot, and the brand route's own `errorComponent`). The fix makes loaders resilient and lets transient failures self-heal.

## 1. `src/routes/_authenticated/dashboard.tsx`

**A1 — non-critical prefetches.** `setup` is the only truly optional query here (used via `useQuery`, not Suspense). `watchlist` is consumed by `BrandCard` via `useSuspenseQuery`, and `houses` is the Suspense root of the page — both must remain critical or the page Suspense-throws.

```ts
loader: ({ context }) => {
  if (context.auth?.status !== "authenticated") return null;
  // Optional — never blocks render, never fails the route.
  void context.queryClient.ensureQueryData(setupQueryOptions).catch(() => {});
  // Critical for first paint.
  return Promise.all([
    context.queryClient.ensureQueryData(housesQueryOptions),
    context.queryClient.ensureQueryData(watchlistQueryOptions),
  ]);
},
```

**A2 — in-page `errorComponent` + `notFoundComponent`** wrapped in `<PageLayout>` so a failure never escapes to the full-screen root error. Eyebrow "Couldn't load the signals", body uses `error.message` directly (optionally mapped to a friendly line if it equals the known fetch wordings), retry button calls `router.invalidate()` then `reset()`.

## 2. `src/routes/_authenticated/watchlist.tsx`  *(apply A1 + A2)*

Same split — only `setup` becomes background; `watchlist` and `houses` stay awaited (both are read with `useSuspenseQuery` on this page). Add a matching in-page `errorComponent` + `notFoundComponent` so this route never bubbles up either.

## 3. `src/routes/brand.$id.tsx`

**B1 — abort-aware loader catch.** In the authenticated branch's `catch`, re-throw immediately when `abortController.signal.aborted` so a router-cancelled navigation does NOT mount the brand error UI. Keep the existing `isRedirect` / `isNotFound` / `isAuthShapedError` branches as-is.

**B2 — keep the real error card.** Leave `errorComponent` rendering "Couldn't load this brand" with a real Try Again. No message-pattern matching to silently swallow errors. Retry calls `router.invalidate()` + `reset()` so the wrapped `getHouseDetail` retry actually re-runs.

**Drop B3.** No `replace: true` on the back-to-dashboard link.

## 4. Real fix for screenshot 1 — wrap `getHouseDetail` in `ensureQueryData` with retry

Today the brand loader calls `getHouseDetail(...)` directly with no retry, so a single transient failure (Vite HMR dropping the chunk, momentary 504, refresh-token race) becomes a user-visible error. Switch to the codebase pattern used by `housesQueryOptions` / `watchlistQueryOptions`:

In `src/lib/brands.functions.ts` (or co-located with the brand route — match where `housesQueryOptions` lives):

```ts
export const houseDetailQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["houses", "detail", slug] as const,
    queryFn: () => getHouseDetail({ data: { slug } }),
    retry: 2,                                  // self-heal transient failures
    retryDelay: (i) => Math.min(400 * 2 ** i, 1500),
  });
```

In the brand loader (authenticated branch):

```ts
const detail = await context.queryClient.ensureQueryData(houseDetailQueryOptions(params.id));
```

Component swaps `Route.useLoaderData()` → `useSuspenseQuery(houseDetailQueryOptions(params.id))` for the auth branch (the public-preview branch keeps `Route.useLoaderData()` since it doesn't go through Query).

Result: a one-off failure now retries silently and the user never sees Screenshot 1. The same retry also applies on `router.invalidate()` from `AuthErrorRecovery`'s one-shot reset, so transient 401s after token refresh recover without any UI.

## 5. Diagnostic — preview-sandbox vs production

Add a single `console.warn` line in the brand loader catch (and one in the dashboard / watchlist error components) while we test, so a real recurring failure isn't masked by retries:

```ts
} catch (err) {
  if (abortController.signal.aborted) throw err;
  if (isRedirect(err) || isNotFound(err)) throw err;
  console.warn("[brand-loader] non-fatal failure", err); // TEMP — remove once verified in prod
  if (!isAuthShapedError(err)) throw err;
  // fall through to public view
}
```

After verifying in the deployed preview (not just sandbox HMR), remove the `console.warn` lines.

## Out of scope

- Auth flow, `AuthErrorRecovery`, sticky `hasBeenAuthenticated`, `attachSupabaseAuth`.
- Server-fn signatures or DB queries.
- View Transition / scroll restoration / focus restoration wiring.

## Verification

1. Rapid dashboard → brand → back → brand → no error overlays.
2. Throttled "Slow 3G", same flow → at most a brief pending state, no error UI.
3. Temporarily make `getHouseDetail` throw once → retry succeeds silently; throw always → brand `errorComponent` shows with working Try Again.
4. Force a dashboard loader failure → in-page error card inside `<PageLayout>`, no full-screen root error.
5. Check console for the temporary `[brand-loader] non-fatal failure` line in deployed preview to decide whether the underlying failure was sandbox-only HMR noise or a real production issue worth investigating further.
6. After verification: remove the temporary `console.warn` lines and update `AI_PROJECT_HANDOFF.md` (loader-resilience + `houseDetailQueryOptions` retry notes).
