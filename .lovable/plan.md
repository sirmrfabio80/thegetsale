## Public marketing homepage + auth separation

Make `/` a public landing page and put the real product behind a sign-in gate. No Supabase in this prompt — auth is a small local stub that can be swapped for real auth later without touching pages.

### Route restructure

Move authenticated product routes under a pathless `_authenticated` layout. URLs do not change (the underscore prefix is pathless).

```
src/routes/
  __root.tsx
  index.tsx                       (public — REBUILT as marketing landing)
  login.tsx                       (new, public)
  signup.tsx                       (new, public)
  _authenticated.tsx               (new — guards children, renders <Outlet/>)
  _authenticated/
    dashboard.tsx                  (moved from src/routes/dashboard.tsx)
    watchlist.tsx                  (moved from src/routes/watchlist.tsx)
    setup.tsx                      (moved from src/routes/setup.tsx)
    brand.$id.tsx                  (moved from src/routes/brand.$id.tsx)
```

Move is file-relocation only — internal logic, imports, and `Link to="/dashboard"` style usages stay intact. `createFileRoute("/dashboard")` becomes `createFileRoute("/_authenticated/dashboard")` etc.

`_authenticated.tsx` uses `beforeLoad` to read auth from router context and `throw redirect({ to: "/login", search: { redirect: location.href } })` when not signed in. Component is `() => <Outlet />`.

### Local auth stub (`src/lib/auth.ts`)

Storage key `theget.auth.v1` holds `{ email: string }`. Pure helpers:
- `getAuth(): { isAuthenticated: boolean; email: string | null }` — SSR-safe
- `signIn(email: string)` — writes storage, dispatches a `theget:auth` window event
- `signOut()` — clears storage, dispatches event
- `useAuth()` hook subscribes to the event so nav re-renders on sign in/out

Router context (`src/router.tsx`) gets `auth: { isAuthenticated: boolean }`, read once at router creation from `getAuth()`. On auth change we call `router.invalidate()` so `beforeLoad` re-runs. (No Supabase, no real sessions — explicitly a placeholder until real auth lands.)

### Public marketing page (`src/routes/index.tsx`, rebuilt)

Uses a new `MarketingLayout` (separate from the app `PageLayout`) so the chrome is distinct from the signed-in product.

Sections, in order:

1. **Top nav** — sticky, porcelain bg, hairline border. Left: `The Get` wordmark (Instrument Serif). Right: `Sign in` text link + `Sign up` primary button (ink-black fill, white text, ≥44px tap target). Mobile: same layout — wordmark left, Sign in + Sign up right, no hamburger needed at this density.
2. **Hero** — generous top padding. Eyebrow `Private shopping intelligence`. Headline `Know when to buy.` / `Know when to wait.` (second line italic muted). Supporting copy as per brief. Two CTAs: primary `Create your signal` → `/signup`, secondary `See how it works` → `#how-it-works` anchor.
3. **How it works** (`#how-it-works`) — 3-column editorial grid: `Cadence — markdown rhythm by house`, `Inventory — availability and scarcity movement`, `Market — seasonal timing and category signals`. Numbered (01/02/03), serif numerals, muted body copy.
4. **Dashboard preview tease** — section header `A look inside`. Grid of 3 mock signal cards (`SignalPreviewCard`) showing only: category eyebrow, house name, one-line headline, signal badge. Lower half (confidence/window/depth row) is rendered as blurred placeholder bars (no real values, no link to the real brand pages). Below the grid: muted line `Full signals unlock after sign-up.` with a small inline `Create your signal` link. Built as a static preview component using lightly fictionalised copy — does not import `brands` data, does not link to `/brand/...`, does not render anything from the authenticated product.
5. **Editorial pull-quote** — keep the existing editor's note styling for tone (single italic serif quote).
6. **Final CTA** — full-width band: serif headline `Start with the houses you already watch.`, primary button `Create your signal` → `/signup`, small `Sign in` text link beneath.
7. **Footer** — minimal: wordmark left, prototype note right (same as today).

### Login / Signup pages

Minimal editorial pages reusing the marketing chrome:
- `/login` — email + password fields, `Sign in` button. Submitting calls `signIn(email)` then `navigate({ to: search.redirect ?? "/dashboard" })`. Link to `/signup` underneath.
- `/signup` — same shape with `Create your signal` button. On submit: `signIn(email)` then redirect to `/setup` (so the existing post-signup flow kicks in).
- Both have `validateSearch` for an optional `redirect` string, and `beforeLoad` that bounces signed-in users straight to the redirect target (or `/dashboard`).
- Password field is decorative only in this prompt (no validation/storage) — explicitly a stub until real auth.

### Components added

- `src/components/marketing/MarketingLayout.tsx` — page wrapper with `MarketingNav` + footer.
- `src/components/marketing/MarketingNav.tsx` — wordmark, Sign in link, Sign up button. Reads `useAuth()`; if signed in, shows `Open app` → `/dashboard` and `Sign out` instead.
- `src/components/marketing/SignalPreviewCard.tsx` — static teaser card with blurred lower section. No data dependency on `brands`.
- `src/components/marketing/Hero.tsx`, `HowItWorks.tsx`, `PreviewSection.tsx`, `FinalCTA.tsx` — small section components to keep `index.tsx` readable.

### Authenticated app chrome

`PageLayout` (used by dashboard/watchlist/brand/setup) gets a small addition: a right-side `Sign out` text link in `TopNav` when authenticated. No other changes to existing dashboard/watchlist/brand card logic.

### Files

- Add: `src/lib/auth.ts`, `src/components/marketing/{MarketingLayout,MarketingNav,Hero,HowItWorks,PreviewSection,FinalCTA,SignalPreviewCard}.tsx`, `src/routes/login.tsx`, `src/routes/signup.tsx`, `src/routes/_authenticated.tsx`
- Move: `dashboard.tsx`, `watchlist.tsx`, `setup.tsx`, `brand.$id.tsx` → `src/routes/_authenticated/`
- Edit: `src/routes/index.tsx` (rebuild marketing page), `src/router.tsx` (wire auth context), `src/components/PageLayout.tsx` (Sign out link when authed)

### Out of scope

- Real auth (Supabase, password storage, OAuth). The `auth.ts` stub is explicitly local-only.
- Any change to brand cards, dashboard filters, watchlist, setup flow, or `/brand/$id` content.
- New mock data — preview cards use hard-coded fictional copy in the preview component, not the real `brands` array.

### Risks

- Moving files updates `routeTree.gen.ts`. Internal `<Link to="/dashboard">` etc. keep working because the URL is unchanged, but the route id changes to `/_authenticated/dashboard`. Any code using route ids directly (rare here) would need updating — I'll search for those before moving.
- The local auth stub is trivially bypassable (DevTools). That's acceptable for a prototype; the real gate lands when Supabase auth is added.