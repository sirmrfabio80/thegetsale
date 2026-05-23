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
| Signals dashboard | `/dashboard` | `routes/_authenticated/dashboard.tsx`, `components/BrandCard.tsx` | Backend-connected | Reads `listHousesForDashboard`; sort uses personal setup + style affinity. |
| House detail | `/brand/$id` | `routes/brand.$id.tsx`, `components/brand/SignalEditorial.tsx`, `SaleTimeline.tsx`, `RecommendationCard.tsx` | Backend-connected (public fallback for logged-out) | Has dual loader path: auth → `getHouseDetail`, public → `getPublicHouseDetail`. |
| Watchlist | `/watchlist` | `routes/_authenticated/watchlist.tsx`, `data/store.ts`, `lib/watchlist.functions.ts`, `user_watchlist` table | Production-ready, optimistic | Recently fixed toast loop; do not re-add effect-driven popups. |
| Setup / onboarding | `/setup` | `routes/_authenticated/setup.tsx`, `components/setup/*`, `data/setupStore.ts`, `lib/setup.functions.ts`, `user_setup` table | Production-ready | Persists departments, houses, categories, styles, notification prefs. |
| Profile + avatar | `/profile` | `routes/_authenticated/profile.tsx`, `components/profile/*`, `lib/profile.functions.ts`, `avatars` storage bucket | Production-ready | Signed avatar URLs, 1h TTL. |
| Admin: houses | `/admin/sales` (Houses tab) | `components/admin/HousesTab.tsx`, `HouseDrawer.tsx`, `lib/admin-houses.functions.ts` | Working | `ensureAdmin` gate via `has_role` RPC. |
| Admin: sale events | `/admin/sales` (Sales tab) | `components/admin/SaleEventsTab.tsx`, `SaleEventDrawer.tsx`, `lib/admin-sales.functions.ts` | Working | Status: draft/published/hidden. |
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
- `_authenticated` layout renders `HydratingShell` (shimmer skeleton) until session hydrates; "slow" copy after 1.8s, "stuck" + Sign-in-again link after 7s.
- `AuthErrorRecovery` detects JWT/Unauthorized errors, signs out locally, redirects to `/login`.
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
- `brands` — houses. Cols: `slug`, `name`, `category`, `tagline`, `house_group`, `editorial_copy`, `description`, `country`, `website_url`, `is_active`. RLS: admins manage; authenticated read where `is_active=true`.
- `sale_events` — admin-confirmed past/upcoming sales. `status` draft/published/hidden, `sale_type`, `discount_min/max`, dates.
- `sale_predictions` — generated predictions. `status`, `confidence_score/label`, `predicted_start/end_date`, `basis_years`, `algorithm_version`, `sample_size`, `signal`. **Generator: `unclear`.**
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
- **Color tokens** (`styles.css`, oklch): `background`, `foreground`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `ring`, and signal palette `--signal-soon/-hold/-buy/-low`.
- **Radius**: `--radius: 0.25rem` — deliberately tight/architectural.
- **Spacing/scale**: max width `5xl` for app, `3xl` for editorial blocks; sections breathe with `py-16/24`.
- **Motion**: minimal — shimmer skeletons (`@keyframes theget-shimmer`), no Framer/GSAP.
- **Patterns**:
  - "Eyebrow" caps label (`.eyebrow`, 11px, 0.18em tracking).
  - Hairline rules (`.hairline`).
  - Outline-square buttons (uppercase 11px, 0.18em tracking).
  - SignalBadge color-coded by `--signal-*`.
- **Responsive**: mobile-first; grids collapse to single column; nav avoids overflow.
- **Accessibility**: focus rings via `--ring`; `aria-busy`/`aria-live` on shells; semantic headings. Some custom buttons could use better focus contrast — `unclear`, worth audit.
- **Inconsistencies / polish opportunities**:
  - Root `<head>` still has `"Lorem ipsum"` description + Twitter copy.
  - `og:image` is on `__root.tsx` (overrides every leaf). Should move to leaf routes.
  - Some admin tabs are denser/less editorial than the public app.
  - No dark mode tokens defined despite `@custom-variant dark`.

## 10. Domain rules and terminology

- **House** = a fashion brand row. Internally `brand`, externally always *house*.
- **Signal**: enum `buy | soon | hold | low`. Drives badge color, sort, copy.
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
  - Never rename "house" back to "brand" in copy.
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
  - `_authenticated` redirects unauthenticated users to `/`.
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
- **Preserve terminology**: house / signal / window / depth / cadence / The Get.
- **Fragile flows**: `_authenticated` HydratingShell timing, `AuthErrorRecovery` (don't throw new error types past it), brand.$id dual loader.
- **Files requiring caution**: `routes/_authenticated/watchlist.tsx` (recently de-looped), `routes/brand.$id.tsx`, `lib/auth.ts`, `router.tsx`.
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
- **`AuthErrorRecovery`** — catches JWT errors and re-auths the user.

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
