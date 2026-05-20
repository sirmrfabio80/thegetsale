## Goal

Add a "Houses" admin tab that lets admins create, edit, activate/deactivate and browse fashion houses. Reuse the existing `brands` table (UI calls them Houses; DB keeps `brands`). Keep Sale Events working and let new active houses appear in its brand selector.

## Database

The `brands` table already exists with `id, slug, name, house_group, is_active, created_at, updated_at`. Missing fields → one small additive migration:

```sql
ALTER TABLE public.brands
  ADD COLUMN description text,
  ADD COLUMN country text,
  ADD COLUMN website_url text;

-- updated_at trigger (uses existing public.update_updated_at_column)
CREATE TRIGGER brands_set_updated_at
BEFORE UPDATE ON public.brands
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Unique slug (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS brands_slug_unique_lower
  ON public.brands (lower(slug));
```

No `logo_url` in this pass (no existing logo bucket; out of scope per prompt).

RLS already correct:
- "Admins manage brands" (ALL) — admin write access.
- "Authenticated read active brands" (SELECT where `is_active = true OR has_role(admin)`) — dashboard read.

No RLS changes needed.

## Server functions

New file `src/lib/admin-houses.functions.ts` (mirrors `admin-sales.functions.ts` style, uses `requireSupabaseAuth` + `ensureAdmin`):

- `listHouses({ search?, group?, status?: 'active'|'inactive'|'all' })` → returns all rows for admin view.
- `createHouse({ name, slug, houseGroup?, country?, websiteUrl?, description?, isActive })`
- `updateHouse({ id, ...fields })`
- `setHouseActive({ id, isActive })`

Server-side zod validation:
- `name` required, trim, max 120.
- `slug` required, `^[a-z0-9]+(?:-[a-z0-9]+)*$`, max 80.
- `websiteUrl` optional, `z.string().url()`.
- Unique slug enforced by DB index; surface friendly error on `23505`.

Update `listBrandOptions` in `admin-sales.functions.ts` so the Sale Events brand dropdown only lists **active** houses for new events, but still resolves names of any brand already attached to an existing sale event (keeps existing rows readable). Implementation: fetch active brands + brands referenced by current `sale_events.brand_id` in the filtered list, merge by id.

## UI

Tab order in `src/routes/_authenticated/_admin/admin.sales.tsx`:
`Houses` · `Sale events` · `Users & roles` · `System`. Default tab → `houses`.

New components:
- `src/components/admin/HousesTab.tsx` — page header copy ("House management" / supporting line), filters (search input, group select, status select Active/Inactive/All), "Add house" button, desktop table (House · Group · Country · Status · Updated · Actions) and mobile stacked cards. Actions: Edit, Activate/Deactivate (no destructive delete). Mirrors `SaleEventsTab` patterns (skeleton loading, empty states, scroll preservation on filter change).
- `src/components/admin/HouseDrawer.tsx` — `Sheet` drawer matching `SaleEventDrawer` exactly (eyebrow `NEW · HOUSE` / `EDIT · HOUSE`, serif title, description, body grid, footer with Cancel + Save). Fields: Name, Slug (auto-derived from Name on create, editable; helper "Used internally for routing and matching."), House group select (Quiet luxury, Heritage, Runway signal, Contemporary, Emerging, Archive / resale), Country, Website URL, Description textarea, Active switch (default on). Client-side zod validation matching server.

Slug auto-derive: lowercase, strip diacritics, replace non-alphanumerics with `-`, collapse/trim hyphens. Stops auto-syncing once user edits slug manually.

## Security

- All four server fns gated by `requireSupabaseAuth` + `ensureAdmin`.
- Admin route already protected by `_authenticated/_admin.tsx`.
- Non-admin reads continue to flow through existing RLS (active brands only).

## Out of scope

- Logo upload (no bucket exists for brand logos).
- Hard delete.
- Changes to sale event drawer/form, prediction logic, dashboard.

## Verification after build

1. New admin tab renders, defaults to Houses.
2. Create a house → appears in list and in Sale Events brand dropdown.
3. Deactivate a house → disappears from "new sale event" dropdown; still shown for any existing sale event already attached.
4. Slug uniqueness rejected with a friendly inline error.
5. Mobile: table collapses to cards, drawer usable, 44px tap targets.
