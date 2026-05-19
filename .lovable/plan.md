## Google sign-in via Supabase Auth

Replace the local-storage auth stub with real Supabase Auth using Google OAuth (via the Lovable broker). All three public CTAs ("Sign in", "Sign up", "Create your signal") lead into the same Google flow.

### Step 1 — Enable Lovable Cloud

The project has no Supabase integration yet. Calling `supabase--enable` provisions a Supabase project, generates `src/integrations/supabase/client.ts`, and sets the env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, etc.). Also call `supabase--configure_social_auth` with `providers: ["google"]` to enable Google in Supabase Auth (without this the first Google sign-in fails with `Unsupported provider`).

### Step 2 — Auth module rewrite (`src/lib/auth.ts`)

Replace the local stub with a thin wrapper around Supabase:

- `useAuth()` hook returns `{ status: "loading" | "authenticated" | "unauthenticated", user, email }`. Subscribes to `supabase.auth.onAuthStateChange` and hydrates from `supabase.auth.getSession()` on mount.
- `signInWithGoogle()` — calls the Lovable broker (`lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth/callback" })`). Required by Lovable guidance — do NOT call `supabase.auth.signInWithOAuth` directly for Google.
- `signOut()` — `supabase.auth.signOut()`.

The old `theget.auth.v1` localStorage key and synthetic `theget:auth` events are removed. Supabase's own persistence handles sessions.

### Step 3 — Router auth context

`src/router.tsx`:
- Context shape becomes `{ queryClient, auth: { status, user } }`.
- On router creation, prime context with `status: "loading"`. Subscribe to `supabase.auth.onAuthStateChange`; on every event, update the router context and call `router.invalidate()` so `beforeLoad` guards re-run.
- Also do an initial `supabase.auth.getSession()` and update context as soon as it resolves.

### Step 4 — `_authenticated` guard with no flicker

`src/routes/_authenticated.tsx`:
- `beforeLoad` reads `context.auth.status`.
  - `"loading"` → don't redirect; let the component render its loading state (returning a pending promise here would block the whole tree; better to render a calm loading shell).
  - `"unauthenticated"` → `throw redirect({ to: "/login", search: { redirect: location.href } })`.
  - `"authenticated"` → fall through to `<Outlet />`.
- Component shows a minimal centered "Loading…" shell when `status === "loading"` so protected content never flashes.

### Step 5 — Post-auth routing (`/auth/callback`)

New file `src/routes/auth.callback.tsx`:
- Renders a calm "Signing you in…" page.
- In a `useEffect`, wait for `supabase.auth.getSession()` to resolve, then:
  - If no session → `navigate({ to: "/login" })`.
  - Else if `loadSetup()?.completedAt` is set → `/dashboard`.
  - Else → `/setup`.
- Honours the `redirect` search param if present (overrides the setup-vs-dashboard decision when set, so the `_authenticated` guard's redirect-back still works).

The OAuth `redirect_uri` passed to the broker points at this route.

### Step 6 — Public CTAs and pages

- **`/signup`** — Rewrite to a single editorial page:
  - Heading: `Create your private signal.`
  - Supporting copy: `Sign in with Google to follow houses, save pieces, and receive sharper buy/wait signals.`
  - Single primary button: `Continue with Google` → `signInWithGoogle()`.
  - Small footer line: `Already with us? Sign in` (also triggers Google flow, since email/password is out of scope).
- **`/login`** — Same shape but with heading `Sign in.` and the supporting copy `Continue with Google to pick up where you left off.` Button label `Continue with Google`. Email/password form is removed.
- **`Hero` "Create your signal"**, **`MarketingNav` "Sign up"** button, and **`MarketingNav` "Sign in"** link all route to `/signup` (no behavioural change needed — `/signup` is now the single Google entry point).
- **`FinalCTA`** — same: keeps linking to `/signup`.

### Step 7 — Authenticated chrome (account entry point)

`src/components/PageLayout.tsx`:
- Replace the simple "Sign out" link in `TopNav` with a tiny account block on the right: rendered only when `auth.status === "authenticated"`.
  - Shows the user's display name (from `user.user_metadata.full_name`) or falls back to email.
  - A small dropdown / popover (use shadcn `DropdownMenu`) with two items: a static "Signed in as …" label and `Sign out`.
- Keep the existing `Signals` / `Watchlist` nav links unchanged.

### Step 8 — Protected route coverage

Already correct from the previous turn: `dashboard`, `watchlist`, `setup`, `brand.$id` all live under `src/routes/_authenticated/`. Confirm during implementation that nothing else slipped out.

### Files

- Edit: `src/router.tsx`, `src/lib/auth.ts`, `src/routes/__root.tsx` (context type), `src/routes/_authenticated.tsx`, `src/routes/login.tsx`, `src/routes/signup.tsx`, `src/components/PageLayout.tsx`, `src/components/marketing/MarketingNav.tsx` (use new `useAuth()` shape and `signOut`)
- Add: `src/routes/auth.callback.tsx`
- Tool calls: `supabase--enable`, `supabase--configure_social_auth` (Google)

### Out of scope (per the prompt)

- Email/password auth, magic links, other providers.
- Profile avatar upload, notifications, profile picture handling.
- Any new tables (profiles, roles). Setup completion still lives in localStorage for now; a `profiles` table can be added in a later prompt without breaking this work.

### Risks / notes

- The previous-prompt sign-in used a localStorage stub. Any user "signed in" before this change will appear signed out — acceptable since no real data is tied to that stub.
- `auth.status === "loading"` on first paint is the trade-off for no flicker; the loading shell is intentionally brief and only shows on protected routes.
- Google in Supabase Auth requires the Google provider to be enabled — handled by `configure_social_auth` in step 1.