# Plan

## 1. Fix the broken profile page

**Likely root cause.** The profile route renders `Something went wrong / This page didn't load` (the root `errorComponent`). The most plausible source is a thrown error during `beforeLoad` or inside the `useProfile` query — currently nothing on the route catches errors locally, so any failure bubbles to the root.

**What I'll change.**

- Add an `errorComponent` and `pendingComponent` on `/_authenticated/profile` so failures show a calm, page-scoped "Couldn't load your profile" panel with a Retry button instead of the global error screen.
- Make `useProfile` resilient: keep `retry: 1`, surface error state via `profileQuery.error` rendered inline.
- Add a tiny `console.error` in the query's `onError` so future failures show up in the preview logs (the project rule is "no log statements unless temporary debugging" — this stays minimal and is the only way to diagnose if the fix doesn't fully resolve it).
- Confirm `getMyProfile` already handles "no row yet" via `maybeSingle()` (it does) — no server change needed.

If after this the page still errors, I'll be able to read the actual server-function error from the surfaced UI and console, and fix the root cause in a follow-up turn.

## 2. Make sirfabio@icloud.com an admin

Run a migration with an idempotent `INSERT … SELECT` that resolves the user id from `auth.users` by email and inserts into `public.user_roles` with role `admin`. Uses `ON CONFLICT (user_id, role) DO NOTHING` so re-runs are safe.

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'sirfabio@icloud.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

## 3. Admin gate (reusable)

- Add `useIsAdmin()` hook: a `useQuery` that calls a new `getMyAdminStatus` server function (uses `requireSupabaseAuth` + `has_role(auth.uid(), 'admin')`).
- Add a pathless layout route `src/routes/_authenticated/_admin.tsx` with `beforeLoad` that calls `getMyAdminStatus` and throws `redirect({ to: '/dashboard' })` for non-admins. This keeps the URL clean (`/admin/...`) and reuses the existing `_authenticated` auth gate.

## 4. `/admin/sales` page (editorial UI, tabs)

Route file: `src/routes/_authenticated/_admin/admin.sales.tsx` → URL `/admin/sales`.

Layout: porcelain background, ink-black serif heading, eyebrow "Admin", brief description.

Tabs (shadcn `Tabs`) to logically group settings:

1. **Sale events** — the CRUD table (default tab).
2. **Users & roles** — list of profiles with a "Make admin / Revoke admin" toggle.
3. **System** — read-only quiet panel showing latest prediction run summary from `prediction_runs` (placeholder for future toggles; no writes here yet).

### Tab 1 — Sale events

- Compact table: Brand · Category · Sale type · Start · End · Discount · Status · Actions.
- Filters row: Brand (select), Category (text), Sale type (select), Status (select).
- "Add sale event" button opens a shadcn `Dialog` form.
- Row actions: Edit (opens dialog), Publish (if draft), Hide (if published), Delete (with confirm).
- Server functions (`src/lib/admin-sales.functions.ts`, all `requireSupabaseAuth` + admin check):
  - `listSaleEvents({ brandId?, category?, saleType?, status? })`
  - `createSaleEvent(input)`
  - `updateSaleEvent({ id, ...input })`
  - `deleteSaleEvent({ id })`
  - `setSaleEventStatus({ id, status })`
- Each handler re-verifies admin via `has_role` before mutating; RLS on `sale_events` already restricts to admins, this is belt-and-braces.
- Validation (zod, client + server):
  - `brand_id` uuid, required.
  - `sale_type` enum, required (mirrors current `text` column; I'll use a closed set: `seasonal | mid_season | private | flash | archive | other`).
  - `start_date` required ISO date; `end_date >= start_date` when provided.
  - `discount_min`/`discount_max`: integers 0–90 when set; `max >= min`.
  - `status`: `draft | published | hidden`.
  - `admin_notes`: optional, max 2000 chars.
- UX: sonner toasts on success/error, button spinners on save/publish/hide/delete, optimistic refetch via React Query `invalidateQueries`.

### Tab 2 — Users & roles

- Lists `profiles` joined with `user_roles` (server function `listUsersWithRoles`).
- Each row: display name (or "Unnamed"), short user id, badge for current role, toggle button.
- Server functions:
  - `setUserAdmin({ userId, isAdmin })` — admin-only; inserts or deletes from `user_roles` for role `admin`.
- Guardrail: cannot revoke your own admin (avoid lockout).

### Tab 3 — System

- Read-only card listing most recent rows from `prediction_runs` (status, counts, timestamps). No actions.

## 5. Navigation hook-up

- Add an "Admin" link in the existing in-app nav (`PageLayout` chrome) visible only when `useIsAdmin()` returns true. Routes to `/admin/sales`.

## Out of scope (per your constraints)

- Prediction algorithm.
- Dashboard/home changes.
- Notifications.

## Technical notes

- **Files added**
  - `src/lib/admin.functions.ts` — `getMyAdminStatus`, `listUsersWithRoles`, `setUserAdmin`, `listPredictionRuns`.
  - `src/lib/admin-sales.functions.ts` — sale-event CRUD.
  - `src/hooks/use-is-admin.ts`.
  - `src/routes/_authenticated/_admin.tsx` — admin gate layout.
  - `src/routes/_authenticated/_admin/admin.sales.tsx` — the page.
  - `src/components/admin/SaleEventTable.tsx`, `SaleEventDialog.tsx`, `UsersRolesTable.tsx`.
- **Files edited**
  - `src/routes/_authenticated/profile.tsx` — add `errorComponent` and `pendingComponent`.
  - `src/hooks/use-profile.ts` — surface error, gentle retry.
  - `src/components/PageLayout.tsx` (or `MarketingNav`'s authed branch) — add Admin link.
- **Migration**
  - Insert admin role for `sirfabio@icloud.com` (only data change; no schema change).
- **Security**
  - All server functions re-check admin via `has_role`; RLS on `sale_events` and `user_roles` already enforces admin-only writes.
  - `setUserAdmin` validates target user exists and refuses to remove the caller's own admin role.
  - Zod validation client-side and server-side; max lengths on free-text fields.

## Verification

- Sign in as you → Admin link appears → `/admin/sales` loads.
- Non-admin account → `/admin/sales` redirects to `/dashboard`.
- Profile page either loads cleanly or shows a scoped error panel with a real message (not the global "didn't load" screen).
- Create / edit / publish / hide / delete a sale event end-to-end with toasts and validation errors.
- Promote and demote a test user via tab 2; cannot demote yourself.

Ready to implement on approval.
