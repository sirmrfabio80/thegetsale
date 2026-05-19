# Database foundation for The Get sale intelligence

## Findings

- No DB `brands` table exists. Brands today live as frontend mock data in `src/data/brands.ts`. I will create the real table.
- No admin role mechanism exists. Only `public.profiles` is in the DB. Per project security rules, roles must live in a separate `user_roles` table, never on `profiles`. I'll create that as the minimal safe foundation.
- Server-side writes (prediction job, admin tools) will go through TanStack `createServerFn` using `supabaseAdmin` (service role), which bypasses RLS — so no separate "service" policy is needed. Admin policies cover the human-admin case.

## What gets created

### 1. Role infrastructure (prerequisite)
- `public.app_role` enum: `admin`, `user`.
- `public.user_roles` table: `(id, user_id → auth.users, role app_role, created_at)` with unique `(user_id, role)`.
- Security-definer function `public.has_role(_user_id uuid, _role app_role) returns boolean`.
- RLS on `user_roles`: each user can read their own roles; only admins can insert/update/delete roles.
- Promoting the first admin is a manual one-off via the data-insert tool after migration (out of scope here).

### 2. `public.brands`
Fields: `id uuid pk`, `slug text unique not null`, `name text not null`, `house_group text`, `is_active boolean not null default true`, `created_at`, `updated_at`.
- Index on `slug`, `is_active`.
- RLS: any authenticated user can `SELECT` active brands; only admins can insert/update/delete.

### 3. `public.sale_events`
All fields per spec. `sale_type` and `status` constrained via CHECK to known values (`status in ('draft','published','archived')`; `source_type in ('admin_confirmed','admin_observed','imported')`).
- Indexes on `brand_id`, `(status, start_date)`.
- RLS:
  - Authenticated users: `SELECT` only when `status = 'published'`.
  - Admins: full insert/update/delete.

### 4. `public.sale_predictions`
All fields per spec. `confidence_score numeric check (between 0 and 1)`, `status` CHECK same values as above.
- Indexes on `brand_id`, `(status, predicted_start_date)`.
- RLS:
  - Authenticated users: `SELECT` only when `status = 'published'`.
  - Admins: full insert/update/delete.
  - Service-role writes (prediction job via `supabaseAdmin`) bypass RLS automatically.

### 5. `public.prediction_runs`
All fields per spec. `status` CHECK in (`running`, `succeeded`, `failed`).
- RLS:
  - Authenticated non-admin: no access.
  - Admins: `SELECT` only.
  - Inserts/updates happen through service-role from the future prediction job (RLS bypassed).

### 6. Shared plumbing
- Reuse `public.update_updated_at_column()` (already exists) via `BEFORE UPDATE` triggers on `brands`, `sale_events`. `sale_predictions` uses `generated_at` and explicit `reviewed_at`, so no `updated_at` trigger.

## Out of scope (per constraints)
- No admin UI.
- No prediction algorithm or job.
- No homepage/dashboard changes.
- No seeding of brand data from `src/data/brands.ts` — that's a follow-up.

## Follow-ups you'll want next
1. Promote your account to `admin` via a one-off insert into `user_roles`.
2. Seed `brands` from the existing frontend list.
3. Replace `src/data/brands.ts` reads with a server function backed by the new table.
