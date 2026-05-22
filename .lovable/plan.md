## Problem

Clicking a House card on the dashboard does not navigate to `/brand/$id`. The TanStack `Link` wiring is correct (`BrandCard.tsx` uses `<Link to="/brand/$id" params={{ id: brand.id }}>`), and the route exists in the generated tree.

The pre-investigation is correct: the failure is in the route loader at `src/routes/brand.$id.tsx`. The `postMessage` and `favicon.ico` console errors are unrelated preview-environment noise and should be ignored.

Two concrete issues in the loader:

1. `ensureQueryData(watchlistQueryOptions)` is fired without `await` and without `.catch(...)`. If the watchlist server fn rejects (auth expired, transient 401/500), the unhandled rejection can abort the navigation.
2. `getHouseDetail` is a `requireSupabaseAuth` server fn called from a top-level (non-`_authenticated`) route. A stale/missing bearer token throws `Unauthorized`, which surfaces as a loader error and blocks navigation rather than falling back to the public view.

## Fix

Keep `/brand/$id` as a top-level route (it has both a members and a public preview path — moving it under `_authenticated` would break the public preview for logged-out visitors).

Edit only `src/routes/brand.$id.tsx`:

1. **Make the watchlist prefetch fire-and-forget safely.** Replace
   ```ts
   context.queryClient.ensureQueryData(watchlistQueryOptions);
   ```
   with a version that swallows rejections:
   ```ts
   void context.queryClient
     .ensureQueryData(watchlistQueryOptions)
     .catch(() => {});
   ```
   Watchlist is non-critical for rendering the brand page — a failure here must never block navigation.

2. **Gracefully fall back to the public view on auth failure.** Wrap the `getHouseDetail` call in a try/catch. If it throws an auth-shaped error (matches the same `Unauthorized|JWT|AuthSession|Invalid (token|Refresh Token)` regex already used in `src/lib/auth.ts` / `_authenticated.tsx`), fall through to `getPublicHouseDetail` instead of surfacing the error. Non-auth errors are re-thrown so the existing `errorComponent` still handles real failures.

   Shape:
   ```ts
   if (authed) {
     void context.queryClient.ensureQueryData(watchlistQueryOptions).catch(() => {});
     try {
       const detail = await getHouseDetail({ data: { slug: params.id } });
       if (!detail) throw notFound();
       return { kind: "auth" as const, brand: detailToBrand(detail) };
     } catch (err) {
       if (isRedirect(err) || isNotFound(err)) throw err;
       if (!isAuthShapedError(err)) throw err;
       // fall through to public view below
     }
   }
   const pub = await getPublicHouseDetail({ data: { slug: params.id } });
   if (!pub) throw notFound();
   return { kind: "public" as const, house: pub };
   ```

   `isAuthShapedError` can be a small local helper (or imported from `src/lib/auth.ts` if already exported there — to be confirmed in build mode by reading the file).

## What this does NOT change

- No change to `BrandCard.tsx`, `RecommendationCard.tsx`, or any other component.
- No change to server functions, RLS, or auth flow.
- No new dependencies.
- No route restructuring (route stays at `/brand/$id`).

## Verification

After the edit:
- Click a House card while signed in → navigates to `/brand/$id` and renders the authenticated dossier.
- Simulate a stale token (or watchlist failure) → navigation still succeeds; the page renders either the auth view (if `getHouseDetail` succeeded) or the public preview (if auth failed).
- Click a House card while signed out → still renders the public preview as today.
