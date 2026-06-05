# AI_PROJECT_HANDOFF.md

> Living handoff document for **The Get**. Read section 19 first for fast context, then dive into the rest. Items marked `unclear` are gaps in this audit, not facts.

---

## 1. Executive summary

- **Product**: **The Get** — a private "shopping intelligence" web app for premium fashion. It tells signed-in users *when to buy and when to wait* on specific fashion houses, based on predicted sale windows.
- **Audience**: Premium-fashion shoppers who already know which houses they care about and want a calmer, curated alternative to discount-spam newsletters.
- **Problem it solves**: Retailers run repeating sale cadences that are hard to read manually. The Get surfaces each house's *signal* (`buy` / `soon` / `hold` / `low`), expected discount depth, and predicted window so users stop buying full-price right before a markdown.
- **Maturity**: Working private-beta prototype. Frontend, auth, database schema, RLS, admin tooling, and watchlist are wired. **Sale predictions appear to be admin-curated rather than algorithmically generated** (the `sale_predictions` table exists with `algorithm_version` but no generator job is visible in the code) — `unclear`.
- **Most important context for a future AI agent**:
  1. Editorial tone is the product. Copy is quiet, serif, restrained — never marketing-loud.
  2. **All toasts are intentionally disabled** via the `@/lib/toast` no-op shim. Do not reinstate `sonner` or mount `<Toaster />`.
  3. Server logic uses **TanStack `createServerFn`**, NOT Supabase Edge Functions.
  4. `routeTree.gen.ts` and `src/integrations/supabase/*` are auto-generated — never hand-edit.

## 2. Product vision and positioning

- **Mission**: Replace anxious refresh-the-site shopping with a quiet, trustworthy read on each house's sale tempo.
- **Personas** (inferred from copy):
  - "Quiet luxury" buyer who follows a small set of houses (Maison Ardoise, North Room, etc.)
  - Returning shoppers who want a personalised feed rather than category browsing.
- **Core jobs-to-be-done**:
  1. *"Should I buy this house's pieces now, or wait?"*
  2. *"Notify me quietly when a watched house is about to move."*
  3. *"Tune what I see to my departments / categories / styles."*
- **Value proposition**: Editorial restraint + cadence intelligence. Calm UI, never urgency-driven.
- **User-facing terminology (hybrid)**: editorial surfaces keep *house*, *signal*, *the read*, *cadence*, *window*, *depth*, *watchlist*, *The Get*, *Editor's note*. Utility surfaces (empty/error states, search placeholders, dashboard filters, watchlist CTAs, badge labels) use plain *brand* and buy/wait language (*Buy now*, *Wait for sale*, *Hold*, *No clear read*). Internally code uses `brand`/`brands` (table + types).

## 3. Current feature inventory

| Feature | Where | Key files | State | Notes / risks |
|---|---|---|---|---|
| Marketing landing | `/` | `routes/index.tsx`, `components/marketing/*` | Production-ready frontend | Redirects authed users to `/dashboard`. |
| Email + Google auth | `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback` | `routes/login.tsx` etc., `lib/auth.ts`, `integrations/lovable/index.ts` | Production-ready | Google goes via Lovable broker; never call raw `signInWithOAuth("google")`. |
| Private-beta gate | Across auth pages | `hooks/use-private-beta.ts`, `lib/app-settings.functions.ts`, `app_settings` table | Working | Default ON if row missing. |
| Signals dashboard | `/dashboard` | `routes/_authenticated/dashboard.tsx`, `components/BrandCard.tsx` | Backend-connected | Reads `listHousesForDashboard`; sort uses personal setup + style affinity. Infinite scroll via `useInfiniteCount` + `<InfiniteScrollSentinel/>` (initial 12, +12 on bottom sentinel intersect via IntersectionObserver with `400px` rootMargin). Reset deps are user-driven filters only (filter/q/onlyMine/departments/hasSetup) — data refreshes never reset scroll. Hook exposes `loading` for the sentinel pulse and an internal `cooldownRef` (~220ms) that prevents duplicate intersection triggers. `<BackToTop/>` floating button appears past 720px scroll. No `?page` URL param. |
| House detail | `/brand/$id` | `routes/brand.$id.tsx`, `components/brand/SignalEditorial.tsx`, `SaleTimeline.tsx`, `RecommendationCard.tsx` | Backend-connected (public fallback for logged-out) | Dual loader path: auth → `getHouseDetail`, public → `getPublicHouseDetail`. Public preview shows a single consolidated "Sign in to add to watchlist" CTA that bounces through `/login?redirect=/brand/<slug>`. CTA has inline loading state (`isSigningIn` local state, spinner + "Taking you to sign in…", `disabled` + `aria-busy`) to prevent double-clicks during navigation. |
| Watchlist | `/watchlist` | `routes/_authenticated/watchlist.tsx`, `data/store.ts`, `lib/watchlist.functions.ts`, `user_watchlist` table | Production-ready, optimistic | Recently fixed toast loop; do not re-add effect-driven popups. URL-backed search (`?q=`) and category filter (`?cat=`) via `validateSearch`; infinite scroll via `useInfiniteCount` + `<InfiniteScrollSentinel/>` (12/batch, `loading` pulse + cooldown guard) — no `?page` param. Reset deps are user-driven only (q/cat/departments/sortBy); removing items just clamps via the hook's secondary effect. Sort still in localStorage; department filter still synced via `setup`. Empty-filter state offers a "Clear search & filters" reset. `<BackToTop/>` floating button on mobile/desktop. |
| Setup / onboarding | `/setup` | `routes/_authenticated/setup.tsx`, `components/setup/*`, `data/setupStore.ts`, `lib/setup.functions.ts`, `user_setup` table | Production-ready | Persists departments, houses, categories, styles, notification prefs. Auto-save is debounced (500ms) with a deep-equality guard against the last persisted snapshot; `save` from `useSetupMutation` is the stable TanStack `mutate` ref; chip handlers (`toggleHouse`/`toggleCategory`/`toggleStyleValue`) are `useCallback`-stable and `SelectableChip` is `React.memo`-wrapped so only flipped chips rerender. `handleStart` flushes the pending debounce and sends an immediate completion save. |
| Profile + avatar | `/profile` | `routes/_authenticated/profile.tsx`, `components/profile/*`, `lib/profile.functions.ts`, `avatars` storage bucket | Production-ready | Signed avatar URLs, 1h TTL. |
| Admin: houses | `/admin/sales` (Houses tab) | `components/admin/HousesTab.tsx`, `HouseDrawer.tsx`, `lib/admin-houses.functions.ts` | Working | `ensureAdmin` gate via `has_role` RPC. |
| Admin: sale events | `/admin/sales` (Sales tab) | `components/admin/SaleEventsTab.tsx`, `SaleEventDrawer.tsx`, `lib/admin-sales.functions.ts` | Working | Status: draft/published/hidden. Mobile uses the shared `useInfiniteCount` + `<InfiniteScrollSentinel/>` (20/batch) with the same `loading` pulse, cooldown guard, and standardised end-of-results card as `/dashboard` and `/watchlist`. Reset deps are filter-only so the list doesn't snap back when rows refetch. Renders `<BackToTop/>` on mobile. |
| Admin: users & roles | Tab | `components/admin/UsersRolesTab.tsx` | Working | Uses `user_roles` + `has_role`. |
| Admin: settings | Tab | `components/admin/SettingsTab.tsx`, `app-settings.functions.ts` | Working | Toggles private beta. |
| Admin: system | Tab | `components/admin/SystemTab.tsx` | `unclear` — needs read |
| Prediction generation | `sale_predictions`, `prediction_runs` tables exist | no generator function found in `src/` | **Mock/manual** — `unclear` whether anything writes predictions |
| Static fallback brands | `data/brands.ts`, `data/store.ts` (`getBrand` helper) | Used as fallback inside watchlist and brand page | Mock-only | Eight hardcoded houses. Risk: drift from DB. |

## 4. User journeys and app flow

**Public visitor**
```
/ (Hero, HowItWorks, PreviewSection, FinalCTA)
  → /signup or /login
    → /auth/callback (OAuth) → /dashboard
```

**Authenticated first-run**
```
/dashboard ──"Set up signals"──▶ /setup (departments → houses → categories → styles → notifications)
                                        │
                                        ▼
                                  user_setup row written → back to /dashboard (personalised)
```

**Browsing flow**
```
/dashboard ──card click──▶ /brand/$id ──Bookmark──▶ user_watchlist
                                  │
                                  └── Accordion: factors, history
```

**Watchlist flow**
```
/watchlist ──department filter / sort──▶ list of WatchlistCard
            ──select mode──▶ removeMany (optimistic)
```

**Admin flow** (`has_role(uid,'admin')`)
```
/admin/sales (tabs: Houses · Sales · Users · Settings · System)
   create/edit House → admin-houses.functions
   create/edit SaleEvent → admin-sales.functions
```

**Empty/loading/error states**
- `_authenticated` layout renders `HydratingShell` (shimmer skeleton) only on the first commit before auth resolves; a module-scoped `hasBeenAuthenticated` latch keeps `<Outlet />` mounted afterwards so the skeleton cannot reappear mid-session. "Slow" copy after 1.8s, "stuck" + Sign-in-again link after 7s.
- `AuthErrorRecovery` uses a one-shot retry: the first auth-shaped error triggers `router.invalidate()` + `reset()` (lets the per-RPC bearer attacher re-read the refreshed session); only a *second* auth-shaped error within 8s actually signs out locally and redirects to `/login`. Latch is module-scoped (the boundary remounts on reset) and cleared on any successful authenticated render.
- Root `ErrorComponent` and `NotFoundComponent` provide editorial-styled fallbacks.

## 5. Routes and information architecture

| Route | File | Public/Protected | Notes |
|---|---|---|---|
| `/` | `routes/index.tsx` | Public (redirects authed to `/dashboard`) | Marketing |
| `/login` `/signup` `/forgot-password` `/reset-password` | `routes/*.tsx` | Public | Email + Google |
| `/auth/callback` | `routes/auth.callback.tsx` | Public | OAuth landing |
| `/brand/$id` | `routes/brand.$id.tsx` | Hybrid — works for authed and public visitors | Loader branches on auth |
| `/dashboard` | `_authenticated/dashboard.tsx` | Protected | Signals feed |
| `/watchlist` | `_authenticated/watchlist.tsx` | Protected | Bookmarked houses |
| `/setup` | `_authenticated/setup.tsx` | Protected | Personalisation wizard |
| `/profile` | `_authenticated/profile.tsx` | Protected | Account + avatar |
| `/admin/sales` | `_authenticated/_admin/admin.sales.tsx` | Protected + admin role gate | Admin console |

**Layout hierarchy**
```
__root.tsx (HTML shell, QueryClientProvider, head meta, error/notfound)
├── index, login, signup, forgot/reset, auth.callback, brand.$id (public/hybrid)
└── _authenticated.tsx (auth gate + HydratingShell)
    ├── dashboard / watchlist / setup / profile
    └── _admin.tsx (role gate)
        └── admin/sales
```

`PageLayout` and `MarketingLayout` provide shared nav chrome.

## 6. Technical stack

- **Framework**: TanStack Start v1 (React 19, Vite 7, file-based routing, SSR).
- **Deployment runtime**: Cloudflare Workers (`@cloudflare/vite-plugin`, `wrangler.jsonc`).
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite`; tokens in `src/styles.css` (oklch).
- **Component library**: shadcn/ui (Radix primitives) under `src/components/ui/*`.
- **Icons**: `lucide-react`.
- **State / data**: TanStack Query (`QueryClient` in router context), `useSuspenseQuery` + `ensureQueryData` loaders. No Redux/Zustand.
- **Backend**: Lovable Cloud (Supabase) — Postgres + Auth + Storage.
- **Server logic**: `createServerFn` in `src/lib/*.functions.ts`; admin client `client.server.ts` for elevated/public reads.
- **Auth**: Supabase Auth (email/password) + Google via Lovable broker (`@lovable.dev/cloud-auth-js`). `attachSupabaseAuth` global function middleware attaches bearer tokens.
- **Storage**: `avatars` bucket (private, signed URLs).
- **Validation**: `zod` on every server fn input.
- **Toasts**: `sonner` installed but **shimmed to no-ops** via `src/lib/toast.ts`. Do not import `sonner` directly.
- **Tests**: `vitest` configured; only `src/lib/safeRedirect.test.ts` present.

## 7. Codebase architecture

```
src/
├── routes/                # File-based TanStack routes
│   ├── __root.tsx         # HTML shell, providers, head, error/notfound
│   ├── _authenticated.tsx # Auth gate + HydratingShell
│   └── _authenticated/_admin.tsx  # Admin role gate
├── components/
│   ├── ui/                # shadcn primitives
│   ├── marketing/         # Landing-page sections
│   ├── admin/             # Admin console tabs + drawers
│   ├── setup/             # Onboarding wizard pieces
│   ├── profile/           # Avatar + connected accounts
│   ├── brand/SignalEditorial.tsx
│   ├── BrandCard / WatchlistCard / RecommendationCard / SignalBadge / SaleTimeline / PageLayout
│   ├── CardBase.tsx          # Shared polymorphic card shell (`as` prop, `h-full` + `flex-col`, signal accent/wash, padding tiers `default|hero|empty`, dashed-border variant, hover shadow-2 + active `translate-y-px`, standardized keyboard `focus-visible:ring-2 ring-ring ring-offset-2`). Co-exports: `CardClampedText` (polymorphic `as`, reserves N lines via `line-clamp-2|3` + `min-height` so heights never shift — covered by `CardClampedText.test.ts`), `CARD_FOCUS_RING` (shared outline+press+transition class for any clickable inside a card), `CardIconAction` (icon-only top-corner toggle button with `pressed` state, shared focus ring, used by BrandCard bookmark), `CardTextAction` (inline text action button, used by WatchlistCard Remove). Consumed by BrandCard, WatchlistCard, RecommendationCard, EmptyStateCard, and SignalPreviewCard (marketing).
│   ├── EmptyStateCard.tsx    # Reusable zero-state surface built on CardBase (`padding="empty"`, `borderStyle="dashed"`, non-interactive). Eyebrow / title / description / actions slots. Used by Dashboard and Watchlist for all empty/filtered-out states so they align with the active card grid.
├── lib/
│   ├── *.functions.ts     # createServerFn entry points (CLIENT-IMPORTABLE)
│   ├── brands.server.ts   # Server-only derivation (deriveDashboardFields)
│   ├── auth.ts            # useAuth() store + sign-in helpers
│   ├── toast.ts           # No-op toast shim
│   ├── safeRedirect.ts    # OAuth redirect allowlist (tested)
│   ├── error-capture.ts, error-page.ts, utils.ts
├── data/
│   ├── types.ts           # Brand / SignalKind / Category / WatchlistItem
│   ├── brands.ts          # MOCK brands fallback (8 houses)
│   ├── store.ts           # Watchlist queryOptions + mutations
│   ├── setupStore.ts      # Setup queryOptions + mutation
│   ├── setupStorage.ts    # Setup types + DEPARTMENT_OPTIONS
│   ├── categoryMap.ts     # Setup→Brand category mapping
│   └── styles.ts          # Style affinity scoring
├── hooks/
│   ├── use-is-admin.ts, use-private-beta.ts, use-profile.ts, use-mobile.tsx
├── integrations/
│   ├── supabase/{client,client.server,auth-middleware,auth-attacher,types}.ts (auto-generated)
│   └── lovable/index.ts (auto-generated OAuth broker)
├── routeTree.gen.ts       # Auto-generated; do not edit
├── router.tsx, start.ts, server.ts, styles.css
```

**Ownership ambiguities**
- `src/data/brands.ts` (mock) vs DB `brands` table: both flow into `/watchlist` and `/brand/$id` via `getBrand()` fallback. Risks drift.
- `useWatchlist`/`useWatchlistMutations` live under `data/`, but the underlying server fn lives under `lib/watchlist.functions.ts`. Convention is consistent but easy to confuse.
- "Signal" and "department" derivations are split: server (`brands.server.ts: deriveDashboardFields`) + client (`data/categoryMap.ts: brandDepartment`). Keep in sync.

## 8. Backend and data model

**Tables**
- `brands` — houses. Cols: `slug`, `name`, `category` *(legacy, deprecated)*, `categories text[]` *(canonical, GIN-indexed)*, `tagline`, `house_group`, `editorial_copy`, `description`, `country`, `website_url` *(canonical global URL — never country-specific)*, `is_active`. RLS: admins manage; authenticated read where `is_active=true`. **Seeded with 31 active houses** (Weekend Max Mara added May 2026 alongside the categories[] migration).
- `brand_links` — per-country URL overrides. Cols: `brand_id`, `country_code` (lowercase ISO 3166-1 alpha-2), `url`. PK `(brand_id, country_code)`. RLS: admins manage; authenticated read. Resolved client-side by `src/lib/brand-links.ts::resolveBrandUrl` using `navigator.language`, falling back to `brands.website_url`.
- `sale_events` — admin-confirmed past/upcoming sales. `status` draft/published/hidden, `sale_type`, `discount_min/max`, dates, `country_code` *(lowercase ISO 3166-1 alpha-2; `NULL` = Global / unspecified market; CHECK + `(brand_id, country_code, start_date)` index)*.
- `sale_predictions` — generated predictions. `status`, `confidence_score/label`, `predicted_start/end_date`, `basis_years`, `algorithm_version`, `sample_size`, `signal`, `country_code` *(same shape as `sale_events`)*. **Generator: `unclear`.**
- `prediction_runs` — admin-only log of generation runs.
- `user_setup` — per-user onboarding selections + notification prefs.
- `user_watchlist` — `(user_id, brand_id)` rows.
- `profiles` — `id`, `display_name`, `avatar_path`. Auto-created by `handle_new_user` trigger (`unclear` if trigger is attached — function exists; no trigger row reported).
- `user_roles` — `app_role` enum; `has_role(uid, role)` RPC is the auth checkpoint.
- `product_categories`, `style_tags` — admin-managed taxonomies feeding the setup wizard.
- `app_settings` — single `global` row with `private_beta_enabled`.

**Storage buckets**: `avatars` (private).

**Edge functions**: none in repo. All server logic is `createServerFn`.

**Data flow**
```
Component → useSuspenseQuery(*QueryOptions) → useServerFn(serverFn)
   → attachSupabaseAuth (Bearer) → requireSupabaseAuth → supabase (RLS) → Postgres
Public reads (brand detail, dashboard for logged-out) → supabaseAdmin scoped by slug/is_active
```

**Mock still in use**: `src/data/brands.ts` (8 hardcoded houses) — referenced via `getBrand()` as a defensive fallback in watchlist + brand detail rendering.

## 9. Design system and UI/UX language

- **Visual direction**: Quiet editorial. Warm off-white background, deep brown-ink foreground, subtle border hairlines, generous whitespace, serif headlines + sans body.
- **Typography**: `Instrument Serif` (display, italic-capable) + `Inter` (body). Loaded async via injected `<link>` in `__root.tsx` to avoid blocking first paint.
- **Color tokens** (`styles.css`, oklch): `background`, `foreground`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `ring`, and signal palette `--signal-soon/-hold/-buy/-low` (Jun 2026 retint: deep botanical green, warm ochre, slate-blue, muted stone) plus matching surface washes `--signal-{buy,soon,hold}-wash`. Elevation tokens `--shadow-1/2/3` and monogram-tint classes `.bg-mono-1..6` also live here.
- **Radius**: `--radius: 0.25rem` — deliberately tight/architectural.
- **Spacing/scale**: max width `5xl` for app, `3xl` for editorial blocks; sections breathe with `py-16/24`.
- **Motion**: CSS-only — shimmer skeletons (`@keyframes theget-shimmer`), `reveal-on-scroll` (shared `useReveal` IntersectionObserver in `hooks/use-reveal.ts`), `meter-fill` (segmented distribution bar), native View Transitions crossfade between routes (router `defaultViewTransition: true`, tuned via `::view-transition-old/new(root)` in `styles.css`; silent no-op on browsers without the API — replaced the old `key={pathname}` remount + `.page-fade`), `useCountUp` (radial confidence arc + numerals). All gated behind `prefers-reduced-motion: reduce`. No Framer/GSAP.
- **Patterns**:
  - "Eyebrow" caps label (`.eyebrow`, 11px, 0.18em tracking).
  - Hairline rules (`.hairline`).
  - Outline-square buttons (uppercase 11px, 0.18em tracking).
  - Paper-grain background via inlined SVG noise on `body` (multiply blend, ~3.5% opacity); `.paper-grain-heavy` utility for header bands.
  - Per-signal left rail on `BrandCard`, `RecommendationCard`, `WatchlistCard`, `SignalEditorial` (`var(--signal-{signal})`). Active cards (`signal !== "low"`) also get the matching `*-wash` tint and full Confidence/Window/Depth metric grid; `low` stays the quiet single-line state.
  - `EditorialBand` (`components/dashboard/EditorialBand.tsx`) — dashboard header band with serif headline on a `bg-background/75 backdrop-blur` plate. Default asset is a procedural SVG (`src/assets/editorial-band-default.svg`); takes an optional `imageUrl?` prop so a later phase can wire admin-set assets without changing the component contract.
  - `SignalDistribution` (`components/SignalDistribution.tsx`) — animated segmented bar; props `{ buy, wait, hold, low, total }` matching the dashboard's `counts` shape.
  - `ConfidenceArc` (`components/ConfidenceArc.tsx`) — small radial SVG arc + numeric `{score}/100` text (signal is never colour-only); mounted inside `SignalEditorial`'s top rail.
  - SignalBadge color-coded by `--signal-*`.
- **Responsive**: mobile-first; grids collapse to single column; nav avoids overflow.
- **Accessibility**: focus rings via `--ring`; `aria-busy`/`aria-live` on shells; semantic headings. Some custom buttons could use better focus contrast — `unclear`, worth audit.
- **Inconsistencies / polish opportunities**:
  - Root `<head>` still has `"Lorem ipsum"` description + Twitter copy.
  - `og:image` is on `__root.tsx` (overrides every leaf). Should move to leaf routes.
  - Some admin tabs are denser/less editorial than the public app.
  - No dark mode tokens defined despite `@custom-variant dark`.

## 10. Domain rules and terminology

- **House / Brand**: same entity. Use *house* in editorial copy (hero, landing, brand-detail editorial, Editor's note). Use *brand* in utility copy (empty states, search placeholders, dashboard filters, watchlist CTAs, error fallbacks). Internally always `brand`.
- **Signal**: enum `buy | soon | hold | low`. Drives badge color, sort, copy. Badge labels (utility): *Buy now*, *Wait for sale*, *Hold*, *No clear read*. Editorial kickers (brand detail): *Buy now*, *Wait — sale forming*, *Don't buy yet*, *Not enough signal*.
- **Confidence**: 0–100 numeric; label `low | medium | high`.
- **Window** (`windowDays`): predicted days until next sale.
- **Depth** (`expectedDepth`): expected discount range (e.g. "20–30%").
- **Cadence**: human sentence describing sale frequency.
- **Department**: `Womenswear | Menswear | Unisex | Kidswear` (user-facing facet).
- **Category** (internal): `Womens | Mens | Accessories | Footwear | Jewellery`.
- **Setup categories** (user-facing): `Bags, Shoes, Jewellery, Accessories, Ready-to-wear, Outerwear` — mapped via `categoryMap.ts`.
- **Style preference**: Quiet luxury, Statement, Editorial, Heritage, Street, Contemporary.
- **House group** (admin): Quiet luxury, Heritage, Runway signal, Contemporary, Emerging, Archive / resale.
- **Sale type**: seasonal, mid_season, private, flash, archive, other.
- **Sale status**: draft, published, hidden.
- **Role**: `app_role` enum (admin / moderator / user). Only `admin` is actively checked.
- **Rules an agent must not break**:
  - Keep the hybrid split: editorial = *house*, utility = *brand*. Don't replace one with the other globally.
  - Empty / error / fallback copy must lead with the buy-vs-wait action, not editorial mood.
  - Signal enum strings are persisted — do not change casing.
  - `sortBy` localStorage key is `theget.watchlist.sort`.

## 11. Integrations

| Integration | Purpose | Files | Env / Secrets | Status | Failure modes |
|---|---|---|---|---|---|
| Lovable Cloud (Supabase) | DB, Auth, Storage | `integrations/supabase/*` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, server `SUPABASE_SERVICE_ROLE_KEY` | Live | Misconfigured RLS → empty lists; expired JWT → AuthErrorRecovery boots user to `/login`. |
| Lovable OAuth broker | Google sign-in | `integrations/lovable/index.ts`, `lib/auth.ts` | none in code | Live | Must enable provider via `supabase--configure_social_auth`; otherwise "Unsupported provider". |
| Cloudflare Workers | Hosting | `wrangler.jsonc`, `vite.config.ts`, `@cloudflare/vite-plugin` | Cloudflare env | Live | Avoid Node-only npm packages (no child_process, sharp). |
| Lovable AI Gateway | (none used) | — | `LOVABLE_API_KEY` secret exists | Not wired | Available for future prediction generator. |

No Stripe / email / analytics integrations detected.

## 12. Auth, security, and permissions

- **Auth store**: `lib/auth.ts` — single module-scoped Supabase subscription, exposed via `useAuth()`.
- **Token attachment**: `attachSupabaseAuth` (function middleware in `src/start.ts`) auto-adds `Authorization: Bearer …` to every server-fn call.
- **Server gate**: `requireSupabaseAuth` middleware on every protected `createServerFn`.
- **Admin gate**: every admin server fn calls local `ensureAdmin` → `has_role` RPC; client UI also checks via `useIsAdmin`.
- **Route gates**:
  - `_authenticated` redirects unauthenticated users to `/login?redirect=<current url>`. `/login` reads the `redirect` search param and routes back after sign-in (Google/Apple/email all pass `redirectTo`).
  - `_admin` (assumed) gates `/admin/*` — needs spot-check (`unclear`).
- **RLS**: every user-data table has policies scoped to `auth.uid()`. Admin tables additionally allow `has_role(auth.uid(),'admin')`.
- **Sensitive code paths**:
  - `app-settings.functions.ts: getPrivateBetaEnabled` is unauthenticated by design.
  - `brands.functions.ts: getPublicHouseDetail` uses `supabaseAdmin` for logged-out detail page — must keep projection limited to safe columns.
- **Risks to avoid**:
  - Do not weaken `is_active`/`status='published'` filters in public reads.
  - Do not move role check to client only.
  - Never import `client.server.ts` from components.

## 13. Known issues, risks, technical debt

| # | Severity | Issue | Why it matters | Recommended next step | Now / later |
|---|---|---|---|---|---|
| 1 | High | Mock `src/data/brands.ts` still referenced via `getBrand()` fallback | Risks UI showing stale houses different from DB | Audit fallback; remove or replace with DB-cached snapshot | Later |
| 2 | High | Toast calls remain in `data/store.ts` (and other files) but route through no-op shim | Future agent may re-enable Toaster and reintroduce loops | Either delete dead `toast.*` calls or document that the shim is intentional | Now (low effort) |
| 3 | High | `__root.tsx` head still has `"Lorem ipsum"` descriptions | SEO / share previews look unfinished | Replace with real copy; move `og:image` to leaf routes | Now |
| 4 | Medium | `sale_predictions` has no visible generator | The "intelligence" promise relies on data that's currently manual | Decide: admin-curated only, or implement prediction job (Lovable AI Gateway candidate) | Strategic |
| 5 | Medium | Dashboard `useEffect` writes departments back to setup on every toggle | Extra server writes; race with optimistic UI | Debounce or move into explicit "save" action | Later |
| 6 | Medium | `handle_new_user` function exists but DB report shows no triggers | New users may not get a `profiles` row automatically | Verify trigger; add migration if missing | Now |
| 7 | Low | No dark mode tokens despite `dark` variant set up | Future theming work blocked | Define `.dark` token block in `styles.css` | Later |
| 8 | Low | Only one vitest test file | Regressions in auth / watchlist undetected | Add server-fn unit tests + a Playwright smoke | Later |
| 9 | Low | `any` types in `ensureAdmin(supabase: any, ...)` helpers | Loses type safety | Type with `SupabaseClient<Database>` | Later |
| 10 | Low | `SystemTab` content not reviewed in this audit | `unclear` ownership | Review and document | Later |
| 11 | Done | `/profile` rendered root `errorComponent` ("This page didn't load") | Redundant `beforeLoad` ran `supabase.auth.getUser()` during SSR with no session | Removed; parent `_authenticated` layout is the sole gate | Done |
| 12 | Done | Duplicate `onAuthStateChange` in `router.tsx` + `lib/auth.ts` | Every TOKEN_REFRESHED ran `invalidateQueries` + `router.invalidate` twice — contributor to Safari "significant memory" reloads | Router now subscribes via `subscribeToUser()` from the shared auth store; `QueryClient` defaults set (`staleTime` 60s, `gcTime` 5m, `refetchOnWindowFocus: false`); `defaultPreloadStaleTime` raised to 30s | Done |

## 14. Testing and regression checklist

**Existing**: `src/lib/safeRedirect.test.ts` (vitest).

**Manual smoke after any change**
1. `/` loads, hero animates calmly, "Get an invite" CTA present.
2. Sign up with email → `/auth/callback` → `/dashboard`.
3. Google sign-in completes via Lovable broker.
4. `/dashboard` shows houses; department/category filters work; "Only my selections" honors setup.
5. Click a card → `/brand/$id` loads accordion, timeline, recommendation.
6. Bookmark (auth required); appears optimistically in `/watchlist`.
7. `/watchlist` no popups; sort persists across reload.
8. `/setup` saves and round-trips through dashboard.
9. Admin user reaches `/admin/sales`; non-admin gets redirected.
10. Sign out clears session; protected routes redirect to `/`.

**Suggested future coverage**: server-fn unit tests (zod + RLS happy path), Playwright auth + watchlist + admin guard, snapshot on landing/dashboard.

## 15. Performance and maintainability review

- **Central perf tunables** live in `src/lib/perf-config.ts` (`PERF_CONFIG`): Query `staleTime`/`gcTime`/`refetchOnWindowFocus`/`refetchOnReconnect`, Router `defaultPreloadStaleTime`, plus dev-logger toggles. Tune here, not in `router.tsx`.
- **Dev-only perf logger** in `src/lib/perf-logger.ts` (installed from `src/router.tsx` in dev): logs route transition timings, wraps `QueryClient.invalidateQueries`/`removeQueries` to count + log invalidations, samples `performance.memory` every 15s + on visibility change, and emits a `mem-growth` warning when the JS heap doubles vs. the first sample. Off in production. Filter DevTools console by `[perf]`.

- **Loaders prefetch via `ensureQueryData`** + `useSuspenseQuery` — correct TanStack pattern, avoids waterfall.
- **Optimistic mutations** in `data/store.ts` reduce perceived latency.
- **Module-scoped auth store** in `lib/auth.ts` — single Supabase subscription shared across all components (good).
- **Font loading** is non-blocking (injected `<link>` swap from `print` to `all`).
- **Bundle risk**: full Radix UI suite imported via shadcn (`@radix-ui/react-*` x25). Could prune unused components.
- **Complexity hotspots**:
  - `routes/_authenticated/dashboard.tsx` (~260 LOC) mixes derived filtering, sorting, persistence — splittable into a `useFilteredHouses` hook.
  - `routes/_authenticated/watchlist.tsx` carries a lot of state machinery (selection + restoring refs).
  - `brand.$id.tsx` loader has dual auth/public branching that's clever but fragile.
- **DRY opportunities**: `ensureAdmin` duplicated across three `lib/admin-*.functions.ts` files — move into a shared helper.
- **Architecture simplification**: `data/store.ts` could be renamed to clarify it's the watchlist module; setup vs watchlist live in parallel `data/` files with different conventions.

## 16. Recommended roadmap

**Immediate fixes** (low risk, high signal)
1. Fix `__root.tsx` SEO copy + relocate `og:image` to leaf routes. *Impact: M / Effort: S / Risk: low.*
2. Verify/restore `on_auth_user_created` trigger calling `handle_new_user`. *Impact: H / Effort: S / Risk: low.*
3. Delete now-dead `toast.*` calls or add a one-line comment in `toast.ts` explaining the intentional shim. *Impact: L / Effort: S / Risk: low.*

**Product improvements**
4. Make `/brand/$id` public preview content meaningful (current public DTO scope `unclear`). *I/E/R: M/M/low.*
5. Add a notifications surface for the prefs already collected (`email_signals`, `sms_drops`, `weekly_digest`) — currently inert. *H/L/M.*

**UI/UX polish**
6. Pass on admin console to match editorial language. *M/M/low.*
7. Define dark mode tokens + theme toggle. *L/M/low.*

**Backend/data improvements**
8. Implement prediction generator (Lovable AI Gateway candidate) writing to `sale_predictions`, logged in `prediction_runs`. *Strategic / H / M / M.*
9. Remove or properly cache `src/data/brands.ts` mock fallback. *M/S/low.*

**Refactoring**
10. Extract `ensureAdmin` to shared helper; type the Supabase client. *M/S/low.*
11. Split dashboard hooks (filtering, persistence). *M/M/low.*

**Strategic**
12. Public-facing house pages for SEO/share (already groundwork in `getPublicHouseDetail`). *H/M/M.*
13. Email/SMS digest pipeline. *H/H/M, depends on (5) and (8).*

Suggested order: 1 → 2 → 3 → 9 → 4 → 8 → 5 → 6 → others.

## 17. Guardrails for future AI agents

- **Do not touch without permission**: `src/integrations/supabase/*`, `src/integrations/lovable/*`, `src/routeTree.gen.ts`, `.env`, `supabase/config.toml` project-level fields.
- **Do not reinstate toasts**: `src/lib/toast.ts` is a deliberate no-op. Do not mount `<Toaster />` in `__root.tsx`, do not import from `"sonner"` directly.
- **Do not use Supabase Edge Functions** for app logic — write `createServerFn`.
- **Do not call `supabase.auth.signInWithOAuth("google")`** directly — must go through `lovable.auth.signInWithOAuth`.
- **Preserve hybrid terminology**: editorial = *house / signal / window / depth / cadence / The Get*; utility (empty/error/CTAs) = *brand* + buy/wait verbs. See §10.
- **Keep AI_PROJECT_HANDOFF.md current**: any feature, route, schema, server-fn, terminology, UX-flow, or known-issue change must update the relevant section in the SAME turn. Skip only for typo/format/dep-bump edits.
- **Fragile flows**: `_authenticated` HydratingShell timing + `hasBeenAuthenticated` latch, `AuthErrorRecovery` one-shot retry (don't throw new error types past it; don't reintroduce instant sign-out on first error), router identity-change branches in `router.tsx` (boot/sign-in skips `invalidateQueries`; account-switch scopes to user keys; sign-out does neither), brand.$id dual loader.
- **Files requiring caution**: `routes/_authenticated/watchlist.tsx` (recently de-looped + loader now returns `Promise.all`), `routes/brand.$id.tsx`, `lib/auth.ts`, `router.tsx`, `routes/_authenticated.tsx`.
- **Coding standards**: TypeScript strict, no `any` in new code, zod-validate all server-fn inputs, optimistic-update + rollback pattern for mutations, queries via `*QueryOptions` + `useSuspenseQuery`.
- **UI standards**: tokens only (no raw hex), serif for headlines, uppercase 0.18em tracking for labels, hairline borders, no flashy motion.
- **Incremental work**: prefer surgical edits over rewrites; never regenerate `routeTree.gen.ts`; never alter `auth-middleware.ts` / `client.server.ts`.

## 18. Glossary

- **The Get** — product name.
- **House** — fashion brand (`brands` table).
- **Signal** — `buy | soon | hold | low`, drives card color and copy.
- **Cadence** — sentence summarising sale frequency.
- **Window** — `windowDays`, predicted days to next sale.
- **Depth** — expected discount range.
- **Watchlist** — user bookmarks (`user_watchlist`).
- **Setup** — onboarding selections (`user_setup`).
- **Department** — user-facing facet (Womenswear/Menswear/Unisex/Kidswear).
- **Category** — internal classification on brand row.
- **House group** — admin taxonomy (Quiet luxury, Heritage…).
- **Private beta** — global gate from `app_settings.private_beta_enabled`.
- **`has_role`** — Postgres SECURITY DEFINER RPC checking `user_roles`.
- **`requireSupabaseAuth`** — server-fn middleware injecting `{ supabase, userId, claims }`.
- **`attachSupabaseAuth`** — client function middleware attaching bearer token.
- **`HydratingShell`** — shimmer skeleton shown while session hydrates.
- **`AuthErrorRecovery`** — one-shot retry on the first auth-shaped error; signs out + redirects to `/login` only on a second strike inside an 8s window.

## 19. One-page fast context summary

**The Get** is a private-beta TanStack Start (React 19, Vite, Cloudflare Workers) web app on Lovable Cloud (Supabase). It tells users when to buy or wait on premium fashion **houses** by surfacing per-house **signals** (`buy/soon/hold/low`), a predicted **window**, expected discount **depth**, and a human **cadence** sentence.

Public routes: `/`, auth screens, `/brand/$id` (public preview). Protected: `/dashboard`, `/watchlist`, `/setup`, `/profile`, `/admin/sales`. Auth = Supabase email/password + Google via Lovable broker. Admin = `has_role(uid,'admin')`. Server logic = `createServerFn` in `src/lib/*.functions.ts`; never Supabase Edge Functions. Data = TanStack Query loaders + `useSuspenseQuery`; optimistic watchlist mutations.

Design: editorial, quiet, serif (Instrument Serif + Inter), warm off-white, hairline borders, uppercase 11px eyebrows, oklch tokens in `src/styles.css`. **Toasts are intentionally disabled** via a no-op shim at `src/lib/toast.ts` — do not reinstate.

Watch out for: dual-source houses (`brands` table + `src/data/brands.ts` mock fallback); `sale_predictions` has no visible generator; `__root.tsx` head still has placeholder copy and a root-level `og:image`; `handle_new_user` trigger may not be attached. Preserve terminology (*house*, *signal*, *the read*). Never edit `routeTree.gen.ts` or `integrations/supabase/*`.

---

## 20. Voice & terminology (hybrid)

The Get keeps its editorial voice — `house`, `signal`, `the read`, `cadence` —
but pairs them with plain-English anchors so first-time users (especially the
target "save-money fashion lover" persona) aren't lost:

- First mention: "fashion houses & brands" → then "houses".
- Signal badges read as actions: `Buy now`, `Wait for sale`, `Hold`, `No clear read`.
- Long-form explainers may say "recommendation" or "buy/wait read"
  instead of "signal" when clarity matters.
- "Window" → "expected sale window"; "Depth" → "expected discount" in copy.

**Code identifiers (`SignalKind`, `signal`, `house`, etc.) are unchanged** —
this is a UI-copy rule, not a refactor.

## 21. No products in The Get

A deliberate product decision: The Get tracks **brands/houses and their sale
windows**, not individual items. A sale belongs to a house and covers many
pieces; the user clicks through to the house's own site to browse what's on.

Implications enforced in the UI:
- Watchlist headline is "The houses you're watching" (not "pieces").
- Brand detail does **not** render an item list. Instead, a "See the pieces
  at {house}" panel links out via `brand.websiteUrl` (sourced from
  `brands.website_url`).
- No `saved_pieces` / item table exists or should be added without an explicit
  product decision to change this stance.

## 22. Resolved debt (this pass)

- Watchlist no longer falls back to `src/data/brands.ts` mock — it resolves
  via the dashboard houses query and renders a "No longer tracked" card for
  orphan entries.
- `getWatchedPieces` and the "Pieces you're watching" block on brand detail
  are removed.
- Hardcoded "Eight houses…" dashboard subhead is now computed from loaded
  signals.
- Logged-out "Add to watchlist" navigates straight to `/login?redirect=…`
  instead of relying on a (disabled) toast.
- Onboarding gate relaxed to just 3 houses; SMS toggle hidden until a real
  alert pipeline exists; notifications section labelled "coming soon".
- Editorial polish pass (BrandCard, SignalBadge, dashboard, brand detail,
  RecommendationCard, watchlist empty state):
  - `BrandCard` now has a per-signal left-border accent (`--signal-{buy|soon|hold|low}`),
    larger serif house name (1.5rem), tabular-nums metric values (1.1rem),
    and a subtle hover shadow (no transform).
  - `SignalBadge` uses a 6×6 filled square marker (not a dot); `buy` reads
    as a warm tinted pill (`/[0.08]`); `low` uses a dashed border to signal
    uncertainty through form.
  - Dashboard eyebrow renamed `Today's signals` → `The Read · Today`; a
    hairline + distribution line (`X Buy · Y Soon · Z Hold · W Low`,
    tabular-nums) sits beneath the headline. Department/category filter
    rows tightened (`mt-2`). "Only my selections" → "My Houses".
  - Brand detail: fixed broken `Maison Ardoisedirectly` string; replaced
    "Brand link coming soon" label with a disabled ghost button
    `→ Visit {brand.name}` (opacity-40, cursor-not-allowed).
  - `RecommendationCard` Editor's Note headline reads as a pull-quote
    (2rem Instrument Serif italic) with a left rule in `--signal-soon`.
  - Watchlist empty-state headline: `Nothing on your watchlist yet. Add
    the houses you're watching.`
- **Brand database seed — 18 new houses added** (May 2026):
  Acne Studios, Bec + Bridge, CAMILLA AND MARC, Damson Madder, FARM Rio,
  FRAME, GANNI, Isabel Marant, Isabel Marant Étoile, JOSEPH, Marni,
  Never Fully Dressed, RIXO, Samsøe Samsøe, Soeur, Theory, TOTEME,
  Zimmermann. All fully populated with slug, category (Womens), tagline,
  website URL, country, description, house group, and editorial copy.
- **Multi-category brands + localised URLs** (May 2026):
  - New `brands.categories text[]` (GIN-indexed) replaces the single
    `category` field across the UI. `Brand.categories: Category[]` in
    `src/data/types.ts`; `brandDepartment` derives Womenswear/Menswear/Unisex
    from the array. Legacy `brands.category` column kept temporarily as a
    deprecated mirror — drop in a follow-up.
  - Seeded realistic multi-values for all 34 existing houses (e.g. Marni,
    Acne Studios, Sandro, lululemon, Massimo Dutti = Womens + Mens +
    Accessories + Footwear).
  - **Weekend Max Mara** added as a new house.
  - New `brand_links` table for per-country URL overrides.
    `src/lib/brand-links.ts::resolveBrandUrl(websiteUrl, links, ?cc)` picks
    the locale match via `navigator.language`, else the canonical URL.
  - **US-default URLs removed**: Claudie Pierlot, Maje, ME+EM, Sandro
    rewritten to canonical globals. `brands.website_url` is now the
    canonical/global URL by policy; country-specific destinations belong in
    `brand_links`.
- **Market-aware sale events** (May 2026):
  - Added nullable `country_code` (lowercase ISO 3166-1 alpha-2) to
    `sale_events` and `sale_predictions`, with CHECK constraint and
    `(brand_id, country_code, start_date)` index. `NULL` = Global /
    unspecified, which is also the default for all existing rows.
  - Admin UI: new **Market** field in the sale-event drawer, a Market
    filter (Any / Global only / curated country list) and a Market column
    on the events table; the details drawer shows the resolved market
    label via `marketLabel()` from `src/lib/markets.ts`.
  - Server: `SaleEventDTO` exposes `countryCode`; `listSaleEvents` accepts
    `countryCode` (`""` filters to Global rows, a code filters to that
    market, omitted = no filter); create/update map it to `country_code`.
  - User-facing locale filtering (dashboard, brand detail, predictions)
    intentionally **not** wired yet — follow-up once admins seed per-market
     data.
- **UK sale-event seed import** (May 2026):
  - Imported 91 UK (`country_code='gb'`) sale events across all 35 active
    brands from external research (`uk_sale_events_found_2026-05-24-2.csv`).
    51 rows inserted as `draft` (originally `needs_review`), 40 as
    `published` (originally `verified`). Source attributions kept in
    `admin_notes`.
  - Extended `SALE_TYPES` / `SALE_TYPE_LABELS` in
    `src/lib/admin-sales.functions.ts` with 30 new types observed in the
    data (e.g. `cyber_monday`, `friday_sale`, `winter_archives`, UK
    bank-holiday variants, `sample_sale`, `outlet`). The original 11
    types are preserved at the top of the list. No DB constraint exists
    on `sale_type`, so no migration was needed; the admin drawer
    dropdown picks them up automatically.
  - Source-type mapping applied on import: `official→brand_site`,
    `editorial→press`, `social→manual_research`, `deal_site→price_tracker`,
    `retailer→retailer`.
  - 3 CSV rows had no `start_date`. ARKET `summer_sale` and Massimo
    Dutti `friday_sale` were inserted with inferred dates (noted in
    `admin_notes`). Anine Bing `sale_notification` (permanent signup
    page, not an event) was skipped.
- **Card identity-row redesign** (May 2026):
  - `BrandCard`, `RecommendationCard`, and `WatchlistCard` now use a shared
    identity-row layout: 64×64 `BrandLogo` tile on the left, eyebrow + serif
    name + tagline/meta stacked to the right, signal pill anchored to the
    bottom-right of the right column via `mt-auto` (no absolute positioning,
    so it never overlaps the `line-clamp-2` tagline at narrow widths).
  - `BrandLogo` default `size` raised 40 → 64; `width`/`height` props removed
    in favour of a single square `size`. Image state uses `bg-background` and
    no inner padding (logos bleed to the hairline); monogram fallback uses
    `bg-muted` so empty tiles read as intentionally different.
  - `SignalBadge` `low` variant no longer renders the dashed pill — it now
    renders as quiet inline copy "Awaiting signal" in
    `text-xs text-muted-foreground` with a 6px `bg-border` dot.
  - `BrandCard` stats row: when `brand.signal === 'low'` the three-stat grid
    is replaced by a single line "Awaiting signal · cadence calibrating",
    keeping the same vertical footprint so card heights stay aligned.
  - Bookmark button is now ghost by default (transparent + `border-border`)
    and only fills when watched, so it no longer competes with the brand name.
  - Categories eyebrow truncates to "first 3 · +N" and never wraps.
  - "For you" tag moved above the eyebrow as a small outlined pill.
  - **Brand detail header** (`/brand/$id`) now also renders a `BrandLogo`
    (size 96 in the authenticated view, 88 in the public preview) next to
    the serif house name. `detailToBrand` in `routes/brand.$id.tsx` now
    passes `logoUrl` through from `HouseDetailDTO` to the `Brand` shape.




