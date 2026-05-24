
# Prepare `sale_events` for UK manual sale-history research

Investigation only — no code, no migrations applied. All recommendations below are incremental, reversible, and assume the current `sale_events` table is **empty** (verified: 0 rows for status / source_type / sale_type).

---

## 1. Current findings

### Schema (verified from migrations)
`sale_events` was created in `20260519220503_*.sql`:
- `status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived'))`
- `source_type text NOT NULL DEFAULT 'admin_confirmed' CHECK (source_type IN ('admin_confirmed','admin_observed','imported'))`
- `sale_type text NOT NULL` — **no CHECK** (free text), confirmed
- `discount_min` / `discount_max` — `integer`, no DB CHECK on range
- `country_code` added in `20260523220517_*.sql` with `CHECK (country_code IS NULL OR country_code ~ '^[a-z]{2}$')` and composite index `(brand_id, country_code, start_date)` — matches what was described
- RLS: non-admins limited to `status = 'published'`
- `sale_predictions` shares the same `status` CHECK (`draft|published|archived`)

### TypeScript / app code
- `src/lib/admin-sales.functions.ts`
  - `SALE_STATUSES = ['draft','published','hidden']` ← **mismatch with DB**
  - `SALE_TYPES = ['seasonal','mid_season','private','flash','archive','other']`
  - Zod: discount 0–90, `discountMax ≥ discountMin`, `endDate ≥ startDate` — all present and correct
  - `country_code` is part of `SaleInput` and filter input
- `src/components/admin/SaleEventDrawer.tsx` — form uses `SALE_STATUSES` and `SALE_TYPES`, exposes `countryCode` via a Select bound to `MARKETS` (Global = NULL). No `source_type` field.
- `src/components/admin/SaleEventsTab.tsx` — bulk actions and per-row buttons hardcode `"draft" | "published" | "hidden"`; filter dropdown also uses those three.
- `src/components/admin/SaleEventDetailsDrawer.tsx` — displays `event.status` as-is.
- `src/lib/brands.functions.ts` — user-facing queries filter `status = 'published'` only.
- `src/integrations/supabase/types.ts` — auto-generated; will refresh after migration.

### Confirmation of described state
- Status mismatch: **confirmed** (DB allows `archived`, app uses `hidden`). Any attempt today to send `status: 'hidden'` would fail the DB CHECK. No row has `archived` (table empty).
- `country_code` column, CHECK, index, and admin UI exposure: **confirmed**.
- `markets.ts` `MarketCode` union & `MARKETS` list: **confirmed** in place; `gb` present.
- Discount/date Zod validation: **confirmed** in `SaleInput`.

---

## 2. `status` mismatch — fix

Adopt `draft | published | hidden` everywhere. `hidden` reads better for curated history than `archived`.

Required changes:
1. Drop existing CHECK on `sale_events.status` and `sale_predictions.status`; re-add with `('draft','published','hidden')`.
2. Default stays `'draft'`. RLS policy text doesn't need to change (still keys off `'published'`).
3. No data migration needed — both tables are empty for `status`.
4. App code already uses `hidden`; types regenerate automatically.

Risk: zero (no rows). Reversible: re-run a migration swapping the CHECK back.

---

## 3. Final recommended values

**`status`** (DB CHECK + TS union):
`draft | published | hidden`

**`sale_type`** — replace the existing `SALE_TYPES` constant in `admin-sales.functions.ts` with:
```
summer_sale
winter_sale
mid_season_sale
black_friday
boxing_day
archive_sale
private_sale
retailer_markdown
further_reductions
outlet_sale
other
```
Notes / pushback:
- Keep `other` as an explicit escape hatch so researchers aren't blocked when a real-world sale doesn't fit the taxonomy.
- `boxing_day` is UK-specific; fine for now since this phase is UK-only.
- `further_reductions` overlaps semantically with the second half of `summer_sale`/`winter_sale`. Recommend keeping it — UK retailers explicitly market it as a distinct phase and researchers will want to log it as such.
- **DB CHECK on `sale_type`: defer.** Rely on the TS/Zod enum only for this phase. Reasons: (a) taxonomy is likely to evolve once real research starts, (b) adding a DB CHECK now means another migration the first time the list changes, (c) the enum at the API boundary already blocks bad values. Re-evaluate before opening write access beyond admins.
- Admin UI: display human labels (e.g. "Mid-season sale", "Black Friday", "Further reductions") mapped from machine values.

**`source_type`** — widen DB CHECK to:
```
admin_confirmed
brand_site
email_archive
wayback
retailer
press
price_tracker
manual_research
```
- Migration **is** required (CHECK is on the column). Empty table → safe.
- Default stays `'admin_confirmed'`.
- Add a `SOURCE_TYPES` constant + Zod enum in `admin-sales.functions.ts`, surface as a Select in `SaleEventDrawer` (currently not exposed).
- Recommend widening the CHECK now rather than deferring — `source_type` already has a CHECK so the migration cost is the same either way, and provenance is core to the research workflow.

---

## 4. Category — recommendation

**Defer.** Keep `category text` nullable as-is for this phase.

Reasons:
- The brand-level `categories text[]` already exists on `brands` and covers discovery/filtering.
- Sale-level category at the row is informational; a free-text field with a convention (`null` = whole house, otherwise lowercase slug like `womenswear`, `menswear`, `accessories`, `beauty`) is enough.
- Promoting to `text[]` or a relation now is speculative until research surfaces real need (e.g. "this sale covered womenswear + accessories but not menswear").

Action: document the convention in `admin_notes` template / drawer helper text; no schema change.

---

## 5. Evidence tracking — `admin_notes` template

Stay with `admin_notes`. Do **not** add `sale_event_sources` this phase.

Proposed template (rendered as placeholder text in the Admin notes textarea, and offered via a "Insert template" button next to the field):

```
Evidence
- Source:
- URL:
- Archived URL:
- Observed date:
- Sale copy:
- Discount range:
- Date confidence:
- Notes:

Confidence: low | medium | high
```

Conventions:
- One evidence block per source; researchers can paste multiple blocks separated by a blank line.
- `Date confidence` and trailing `Confidence` line are intentionally separate: the first qualifies the dates, the second qualifies the overall record.
- Keep machine parsing out of scope — text only.

---

## 6. Discount bounds

**Widen to 0–100.** Recommendation: change Zod `discount_min`/`discount_max` upper bound from 90 to 100.

Reasons:
- Archive sales and final clearance can legitimately reach 90%+ and occasionally 95%. Capping at 90 forces researchers to misrecord.
- Keep the cross-field `discount_max ≥ discount_min` refine unchanged.
- No DB CHECK to add — column stays plain `integer`, validation lives in Zod.

`end_date ≥ start_date` validation is already present in `SaleInput` — confirmed, no change.

---

## 7. Migration steps (in order)

One migration file, applied as a single transaction:

```text
1. ALTER TABLE public.sale_events
     DROP CONSTRAINT sale_events_status_check,
     ADD  CONSTRAINT sale_events_status_check
       CHECK (status IN ('draft','published','hidden'));

2. ALTER TABLE public.sale_predictions
     DROP CONSTRAINT sale_predictions_status_check,
     ADD  CONSTRAINT sale_predictions_status_check
       CHECK (status IN ('draft','published','hidden'));

3. ALTER TABLE public.sale_events
     DROP CONSTRAINT sale_events_source_type_check,
     ADD  CONSTRAINT sale_events_source_type_check
       CHECK (source_type IN (
         'admin_confirmed','brand_site','email_archive','wayback',
         'retailer','press','price_tracker','manual_research'
       ));
```

(Exact constraint names to be confirmed from `pg_constraint` when writing the migration; the original migration didn't name them explicitly, so Postgres auto-named them — the real migration will look them up or use `IF EXISTS`.)

Then, in app code (separate change, after migration approval):

```text
4. admin-sales.functions.ts
   - Replace SALE_TYPES list (final values above).
   - Add SOURCE_TYPES constant + Zod enum.
   - Add `sourceType` to SaleInput (default 'admin_confirmed').
   - Bump discount max from 90 → 100.

5. SaleEventDrawer.tsx
   - Source type Select (new).
   - Sale type Select uses new label map.
   - Admin notes textarea: placeholder + "Insert evidence template" button.

6. SaleEventsTab.tsx + SaleEventDetailsDrawer.tsx
   - Sale type label map (machine → human).
   - Optional: show source_type chip in details drawer.

7. supabase/types.ts auto-regenerates after migration runs.
```

---

## 8. Affected files

- `supabase/migrations/<new>.sql` (new)
- `src/lib/admin-sales.functions.ts` — `SALE_STATUSES` (no change in values, just removes mismatch), `SALE_TYPES`, new `SOURCE_TYPES`, `SaleInput` extension, discount bound.
- `src/components/admin/SaleEventDrawer.tsx` — new source-type field, sale-type label map, notes template helper.
- `src/components/admin/SaleEventsTab.tsx` — sale-type label map (display only).
- `src/components/admin/SaleEventDetailsDrawer.tsx` — sale-type / source-type labels.
- `src/integrations/supabase/types.ts` — auto-regenerated.

Not affected: `src/lib/brands.functions.ts` (still filters by `status = 'published'`), prediction logic, user-facing components, `markets.ts`, RLS policies.

---

## 9. Regression risks

- **CHECK constraint names**: Postgres auto-named the original constraints. Migration must look them up dynamically or wrap drops in `DO $$ ... EXCEPTION ... $$` to stay idempotent. Otherwise migration may fail on a fresh DB rebuild.
- **`sale_predictions.status`**: prediction generation code may insert `'archived'` somewhere — needs a quick grep before applying step 2. (Initial scan found no such writes, but worth re-checking the prediction worker once it exists.)
- **Type regeneration lag**: between migration apply and types regen, `status: 'hidden'` inserts will type-error against a stale union. Apply migration first, regenerate types, then ship UI changes — already the standard flow.
- **Researcher confusion**: introducing `source_type` Select without docs may default everything to `admin_confirmed`. Mitigate with helper text under the field.
- **`sale_type` taxonomy churn**: no DB CHECK means a typo in the constant won't be caught by Postgres. Mitigation: Zod enum at the server-fn boundary.

---

## 10. Testing checklist

After migration + code changes:

- [ ] Migration applies cleanly on a fresh DB rebuild (constraint drops are idempotent).
- [ ] `INSERT ... status='hidden'` succeeds; `status='archived'` fails.
- [ ] `INSERT ... source_type='wayback'` succeeds; `source_type='nonsense'` fails.
- [ ] Admin UI: create a new UK event with `country_code='gb'`, every new `sale_type`, every new `source_type`, discount 0–100, future + past dates.
- [ ] Admin UI: bulk publish / hide / draft transitions work for an existing draft.
- [ ] Admin UI: filter by status `hidden` returns the right rows.
- [ ] Admin UI: "Insert evidence template" populates `admin_notes` correctly and can be appended for a second source.
- [ ] Non-admin user: hidden + draft events are invisible (`status='published'` RLS still holds).
- [ ] `brands.functions.ts` dashboard / brand-detail queries still return only published rows for the user's market + globals.
- [ ] TypeScript: no `any` introduced; `SALE_TYPES`/`SOURCE_TYPES`/`SALE_STATUSES` are the single source of truth (no duplicated string literals in components).
- [ ] Drawer Zod: discount 100 accepted, 101 rejected, `discount_max < discount_min` rejected, `end_date < start_date` rejected.
- [ ] `sale_predictions` reads continue to work (status CHECK widened symmetrically).
