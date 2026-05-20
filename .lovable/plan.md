
## Phase 1 — Goal

Move the dashboard and House detail pages off `src/data/brands.ts` and onto the existing backend tables (`brands`, `sale_events`, `sale_predictions`). Keep watchlist, setup, styles, categories, auth callback, marketing, and admin UI untouched. Do not delete any mock data file in this phase.

Product language stays "House" everywhere user-visible. The underlying table is `brands` — that name lives only in code and SQL, never in UI copy.

## Schema changes (single migration)

1. `brands` — add three stable catalogue columns (all nullable):
   - `tagline text`
   - `category text` (free text: Womens / Mens / Accessories / Footwear / Jewellery — kept text, not enum, so admins can extend without migration)
   - `editorial_copy text` (long-form, optional)

2. `sale_predictions` — add one column:
   - `signal text` with CHECK constraint allowing `'buy' | 'soon' | 'hold' | 'low'`, nullable
   Rationale: `signal` and `confidence_label` are separate concepts. `confidence_label` keeps its existing `low | medium | high` meaning. The helper reads `signal` directly and never derives it from confidence.

No other table changes. No new tables. No RLS changes.

## Seed data (same migration)

Insert one row per mock House from `src/data/brands.ts` into `brands`:
- `slug = brand.id`
- `name`, `tagline`, `category`, `is_active = true`
- `house_group = NULL` — do not derive house_group from category. The mock data does not carry a reliable group, so store NULL and let an admin edit it later in the Houses tab.
- Idempotent via `ON CONFLICT` against the existing case-insensitive slug index.

For each mock House's `history[]`, insert into `sale_events`:
- `brand_id` looked up by slug
- `start_date = date`, `end_date = NULL`
- `sale_type = 'other'`
- `discount_min`, `discount_max` parsed from depth ("Up to 30%" → max=30, min=NULL). Leave both NULL when parse fails.
- `status = 'published'`, `source_type = 'admin_confirmed'`, `admin_notes = label` (kept server-side; never returned on public path — see DTO rules)

For each mock House, insert one `sale_predictions` row capturing the current dashboard signal:
- `brand_id`, `predicted_start_date = current_date + windowDays`, `predicted_end_date = NULL`
- `signal = brand.signal`
- `confidence_score = brand.confidence`
- `confidence_label` = `'high'` if score ≥ 75, `'medium'` if ≥ 50, else `'low'`
- `sample_size = history.length`
- `algorithm_version = 'seed-v1'` (clear marker so the daily prediction job can replace them safely)
- `reasoning_summary = brand.headline`
- `sale_type = 'other'`, `status = 'published'`

All seeds are conditional on the row not already existing so re-running is safe.

## Derivation helper (server-side, pure)

`src/lib/brands.server.ts` exports `deriveDashboardFields(brand, events, predictions)`:

| Output | Source |
|---|---|
| `signal` | latest published prediction `.signal`; if missing → `'low'` with `isFallback: true` |
| `confidenceScore` | latest prediction `.confidence_score`; else `0` |
| `confidenceLabel` | latest prediction `.confidence_label`; else `'low'` |
| `windowDays` | `predicted_start_date − today` (clamped ≥ 0); else `null` |
| `lastSaleDays` | `today − max(events.start_date)`; else `null` |
| `expectedDepth` | formatted from latest prediction window when available; otherwise from the most recent event's `discount_min/max`; else `'—'` |
| `cadence` | humanised median gap across the last 4 events ("Sales roughly every 9 weeks"); needs ≥ 2 events, else `null` |

No DB calls inside the helper — pure function, easy to unit-test later.

## Server functions (new file)

`src/lib/brands.functions.ts`:

- **Authenticated path** (dashboard, House detail when signed in)
  - `listHousesForDashboard()` (GET, `requireSupabaseAuth`) — active brands + their latest published prediction + recent published events. Returns full DTOs (incl. `reasoning_summary`, `algorithmVersion`).
  - `getHouseDetail({ slug })` (POST, `requireSupabaseAuth`) — single House with full published history and latest published prediction.

- **Public path** (SSR/prerender for `/brand/$id` preview when signed out)
  - `getPublicHouseDetail({ slug })` (POST, no auth) — uses `supabaseAdmin` but scoped strictly to:
    - `brands.is_active = true`
    - `sale_events.status = 'published'`
    - `sale_predictions.status = 'published'`
  - Returns a **trimmed** DTO that omits: `admin_notes`, `created_by`, `reviewed_by`, `reviewed_at`, `algorithm_version`, `source_type`, `basis_years`, any draft/hidden rows, and anything user-specific. Public DTO carries only what the preview already shows (name, tagline, category, public history dates+labels+depth — where the "label" comes from `admin_notes` it is dropped and replaced with a generic "Sale" so internal notes never leak).
  - Returns `null` when no active House matches → loader throws `notFound()`.

All server fns return plain DTOs (no Postgres rows, no methods, no Date instances — ISO strings only).

## DTO shapes

```ts
// Used by dashboard + authenticated House detail
type HouseDashboardDTO = {
  id: string;          // slug — keeps existing /brand/$id links working
  brandId: string;     // uuid (reserved for later phases)
  name: string;
  category: string;
  tagline: string;
  signal: 'buy' | 'soon' | 'hold' | 'low';
  confidenceScore: number;
  confidenceLabel: 'low' | 'medium' | 'high';
  windowDays: number | null;
  lastSaleDays: number | null;
  expectedDepth: string;
  cadence: string | null;
  headline: string;          // prediction.reasoning_summary
  isFallback: boolean;
};

type HouseDetailDTO = HouseDashboardDTO & {
  editorialCopy: string | null;
  history: { date: string; label: string; depth: string }[];
  factors: { title: string; note: string }[]; // [] in Phase 1
  algorithmVersion: string;  // so UI can flag seed-v1 internally if needed
};

// Public preview — strictly trimmed
type PublicHouseDTO = {
  id: string;
  name: string;
  category: string;
  tagline: string;
  cadence: string | null;
  lastSaleDays: number | null;
  // No signal, no confidence, no window, no depth, no admin_notes, no algorithm_version
  // Matches the current "redacted tiles" design of the public preview.
};
```

## Frontend changes (scoped — no redesign, no copy changes)

- `src/routes/_authenticated/dashboard.tsx`
  - Replace `import { brands } from "@/data/brands"` with `useSuspenseQuery(housesDashboardQueryOptions)`.
  - Loader calls `context.queryClient.ensureQueryData(...)`.
  - Tiny `toBrandCardProps` adapter maps `HouseDashboardDTO` → the existing `Brand` shape consumed by `BrandCard`, so `BrandCard` itself doesn't change in Phase 1.

- `src/routes/brand.$id.tsx`
  - Loader splits by auth: signed-in → `getHouseDetail`, signed-out → `getPublicHouseDetail`.
  - `notFound()` when either returns null.
  - Authenticated view: adapter to existing `Brand` shape (mirrors dashboard adapter).
  - Public preview: pass only the public DTO fields. Today's preview already renders only name, tagline, category, cadence, last markdown — so no UI change is needed, only the data source. The "redacted tiles" stay redacted.

- `src/components/BrandCard.tsx`, `SignalBadge`, `RecommendationCard`, `SaleTimeline`, `WatchlistCard` — unchanged.
- `src/data/types.ts` — unchanged (still the source of `Brand`/`Category` types used by components).
- `src/data/brands.ts` — NOT deleted. Still imported by `WatchlistCard` and `watchlist.tsx`. Cleanup in a later phase.

## Verification after Phase 1

1. Dashboard renders the same 8 Houses with the same signal / confidence / window / depth values.
2. `rg "from \"@/data/brands\"" src/routes/_authenticated/dashboard.tsx src/routes/brand.$id.tsx` returns no matches.
3. `src/data/brands.ts` still exists and is still imported only by `WatchlistCard.tsx` and `watchlist.tsx`.
4. `brands` table has no `signal`, `confidence`, `window_days`, `last_sale_days`, `expected_depth`, or `cadence` columns.
5. Seeded `brands` rows have `house_group = NULL` — no derived groups.
6. `sale_events` contains the seeded history; `sale_predictions` contains 8 rows with `algorithm_version = 'seed-v1'` and a non-null `signal`.
7. Hitting `/brand/<slug>` while signed out returns ONLY public fields — no `admin_notes`, no `algorithm_version`, no `reasoning_summary`, no draft/hidden rows. Verified by inspecting the server fn response.
8. Hitting `/brand/<inactive-slug>` while signed out → 404 (not exposed).
9. Hitting `/brand/<slug>` for a House whose only prediction is `status = 'draft'` while signed out → preview renders with no signal data (public DTO has no signal field anyway), no leak.
10. Admin Sale Events brand dropdown still lists active Houses, including newly admin-created ones.
11. Admin Houses tab unchanged and functional.
12. Watchlist page, Setup wizard, auth callback, marketing pages — zero code changes, behave identically.
13. All user-visible labels still say "House" / "Houses". No "brand" wording introduced in UI copy.

## Explicitly out of scope for Phase 1

- Watchlist persistence and any `user_watchlist` table.
- User preferences table and removal of `localStorage` setup.
- Product categories or style tags tables.
- Deleting any file under `src/data/`.
- Auth callback, setup wizard, marketing route, or UI copy changes.
- Replacing `BrandCard` / `WatchlistCard` prop shapes.
- Building a real prediction algorithm — seed-v1 rows are placeholders.

These are deferred to later phases.
