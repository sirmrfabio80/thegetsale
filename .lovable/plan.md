# Fix: slow logo nav + disappearing avatar (setup → logo → dashboard)

Incorporates the review notes. Two surgical changes ship; two follow-ups noted.

## What the user sees

From `/setup`, click the logo. The navigation feels slow and the avatar + name in the top-nav disappear before the dashboard finishes rendering.

## Root causes (both confirmed)

**A. Logo always links to `/`.** `PageLayout.tsx:45` and `MarketingNav.tsx:13` both use `<Link to="/">`. For an authenticated user this triggers `index.tsx`'s `beforeLoad` → `redirect({ to: "/dashboard" })`. The marketing `<Marketing>` component itself never mounts (the redirect aborts before render), but the route tree still unmounts `_authenticated` → resolves the redirect → remounts `_authenticated`/`dashboard`. That round-trip is the perceived latency.

**B. Auth store resets to `LOADING` when listeners hit zero.** In `src/lib/auth.ts:87-91`:

```ts
if (listeners.size === 0 && supabaseUnsubscribe) {
  supabaseUnsubscribe();
  supabaseUnsubscribe = null;
  currentState = LOADING_STATE;
}
```

During the route transition, the three `useAuth()` subscribers in the old PageLayout (TopNav, `useProfile`, `useIsAdmin`) commit unmount before the new PageLayout commits mount. `listeners.size` hits 0 for a tick, cleanup runs, `currentState` flips to `LOADING_STATE`, the new PageLayout's first snapshot is `loading`, and the `auth.status === "authenticated"` gate on `PageLayout.tsx:52` hides the entire dropdown until Supabase re-fires `INITIAL_SESSION`.

## Changes

### 1. `src/lib/auth.ts` — keep the subscription alive for the tab lifetime

Drop the reset-on-zero-listeners branch. `subscribe` becomes:

```ts
function subscribe(listener: () => void): () => void {
  ensureSubscribed();
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
```

The `if (supabaseUnsubscribe || typeof window === "undefined") return;` guard in `ensureSubscribed` already prevents double-subscribe under StrictMode. Sign-out continues to work: Supabase fires `SIGNED_OUT` → `emit(fromUser(null))` → state transitions cleanly to `unauthenticated`.

### 2. `src/components/PageLayout.tsx` — logo destination depends on auth

Explicit form (avoids the `!== "unauthenticated"` foot-gun during the loading sliver):

```tsx
<Link to={auth.status === "authenticated" ? "/dashboard" : "/"} ...>
  The Get
</Link>
```

### 3. `src/components/marketing/MarketingNav.tsx` — same treatment

Authenticated users who land on a marketing route (e.g. via stale link) get the brand mark linking straight to `/dashboard`. Same explicit conditional.

## Out of scope (intentional)

- **Dashboard loader.** The `Promise.all` is correct and stays.
- **Avatar fade-in re-flash on AvatarBlock remount** (1-frame stutter from `imgLoaded` initializing to `false`). Below threshold for the reported bug. If it shows in verification, fix with a lazy `useState` initializer that probes the image cache via `new Image()` + `.complete`.
- **Token-refresh invalidation storm.** `src/router.tsx:25-34`'s `apply()` runs `invalidateQueries()` + `router.invalidate()` on every auth event, including the hourly `TOKEN_REFRESHED`. That causes the same kind of mid-session flicker after ~1 hour in a tab. Worth a follow-up: short-circuit `apply` when the resolved `user.id` matches the current context. **Not** the cause of this bug; logging here so it doesn't get forgotten.

## Verification

Functional:
- From `/setup`, click the logo: lands on `/dashboard` in a single navigation; dropdown stays mounted and `authenticated` throughout.
- From an unauthenticated session on `/`, marketing nav and logo still behave normally.
- Sign out from the dropdown — chip cleanly disappears; sign back in — chip reappears (confirms long-lived subscription doesn't break the auth lifecycle).

Instrumented (do these in the live preview):
- **React DevTools Profiler**: record the logo click. The new PageLayout's `<DropdownMenu>` should render with `auth.status === "authenticated"` on its first commit — no intermediate render with `status: "loading"`.
- **Network panel**: no extra `auth/v1/token` or `auth/v1/user` request on the click. The Supabase subscription is no longer torn down.
- **Performance panel**: logo-click → dashboard first paint should reduce to loader-resolution time (effectively zero on cache hit) — was previously redirect cycle + auth flip.
