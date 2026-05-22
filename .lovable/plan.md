# Fix "Something went wrong" on app load

## What's actually happening

The browser console reveals the real error behind the generic "Something went wrong" screen:

```
Error: JWT issued at future
  at deserialize (supabase-js)
  at WR → IR → Z0 → HR (supabase auth client)
  → React render path (Tm, jp, Mp, Qm, yr, ug, xg)
```

The Supabase JS client is throwing **synchronously during a React render** when it tries to deserialize the persisted session in `localStorage`. The JWT's `iat` (issued-at) timestamp is ahead of the local clock — most commonly caused by:

- The user's device clock being a few seconds behind real time
- A token that was just refreshed and is technically "from the future" by 1–2 seconds
- Resuming a tab after sleep with clock drift

Because this throw happens inside a React subtree, TanStack Router catches it at the **root** `errorComponent` ([`src/routes/__root.tsx:36`](src/routes/__root.tsx)) and renders the generic "Something went wrong / This page didn't load". The pre-investigation's "Unauthorized" hypothesis was on the right track (auth-related) but the actual trigger is upstream — the auth client never even finishes deserialising the session.

This is intermittent because it only happens when the persisted token's `iat` exceeds `Date.now()` at the moment of read.

## Fix

Two surgical, scope-bounded changes — no new dependencies, no behaviour change for the happy path.

### 1. Defensive session-restore in the browser Supabase usage

Wrap the two places that read the session synchronously during React render in a try/catch that, on `JWT issued at future` (or any deserialize throw), clears the bad session from `localStorage` and treats the user as unauthenticated. This prevents the throw from ever reaching the React error boundary.

Files touched:
- `src/lib/auth.ts` — the `onAuthStateChange` listener already runs in a callback, but `ensureSubscribed()` happens on first `useAuth()` call. If a stale token in storage trips deserialize synchronously, wrap the subscribe call so failure → emit `unauthenticated` instead of throwing.
- `src/integrations/supabase/auth-attacher.ts` is auto-generated and must not be edited. Instead, the same guard in `auth.ts` ensures the session is either valid or cleared before the attacher reads it.

Concretely in `auth.ts`:
- On the first emit, also call `supabase.auth.getUser()` once and, if it returns `AuthSessionMissingError` or a thrown `JWT issued at future`, call `supabase.auth.signOut({ scope: 'local' })` to purge `localStorage`, then emit `unauthenticated`.
- Wrap `supabase.auth.onAuthStateChange(...)` registration in a try/catch; on throw, purge local session and emit `unauthenticated`.

### 2. Route-level `errorComponent` on `_authenticated`

Add an `errorComponent` to [`src/routes/_authenticated.tsx`](src/routes/_authenticated.tsx) that catches any remaining auth-shaped error (`/Unauthorized/`, `/JWT/`, `/AuthSessionMissing/`) and:
- calls `supabase.auth.signOut({ scope: 'local' })`,
- redirects to `/login` (or shows the marketing `/`),

instead of letting it bubble to the root boundary as a generic crash. Non-auth errors still bubble up to the root `errorComponent` as today.

## Why this is the right fix

- Addresses the **actual error** seen in console (`JWT issued at future`), not the secondary "Unauthorized" symptom the external pre-investigation guessed at.
- Keeps the root `errorComponent` as a true last-resort for genuine app crashes.
- No new packages, no schema changes, no edits to auto-generated files (`client.ts`, `auth-attacher.ts`, `auth-middleware.ts`).
- Loader-level changes from the previous turn (the SSR auth guard in `dashboard.tsx`) stay as-is — they're still correct.

## Out of scope

- Token-refresh storm handling (raised earlier as Gap #2) — separate follow-up.
- Server clock validation in the Worker — Cloudflare Workers' clock is reliable; the issue is browser-side deserialization.
- Replacing the root `errorComponent` UI.
