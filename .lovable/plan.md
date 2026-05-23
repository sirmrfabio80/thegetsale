## Status

✅ Migration applied — `sale_events.country_code` and `sale_predictions.country_code` exist (nullable, lowercase ISO-3166-1 alpha-2, with CHECK + index). Existing rows are `NULL` = "Global".

## Remaining work (code only)

### 1. New helper — `src/lib/markets.ts`
Curated list of `MarketCode` (us, gb, fr, de, it, es, nl, se, dk, au, ca, jp) with display labels, plus `marketLabel(code)` that returns "Global" for `null`.

### 2. `src/lib/admin-sales.functions.ts`
- Add `countryCode: string | null` to `SaleEventDTO`.
- Add `countryCode` to `SaleInput` (zod): `z.string().regex(/^[a-z]{2}$/).nullable().optional()`.
- Map it in `mapRow`, `createSaleEvent`, `updateSaleEvent`.
- Add optional `countryCode` filter to `listSaleEvents` (treat empty string as "Global only" → `.is("country_code", null)`; specific code → `.eq`; unset → no filter).

### 3. `src/components/admin/SaleEventDrawer.tsx`
- Add `countryCode: string` ("" = Global) to form state.
- Add a "Market" `Select` after Brand (options: Global + curated list).
- Plumb through `buildPayload` as `countryCode: form.countryCode === "" ? null : form.countryCode`.
- Hydrate from `editing.countryCode` in the effect.

### 4. `src/components/admin/SaleEventsTab.tsx`
- Add Market filter dropdown (Any / Global / curated codes).
- Add `Market` column on desktop table; show market chip on mobile card (subtle, beside the existing category/sale-type meta line).

### 5. `src/components/admin/SaleEventDetailsDrawer.tsx`
- Add a `Market` field using `marketLabel(event.countryCode)`.

### 6. `AI_PROJECT_HANDOFF.md`
- §8 data model: note `sale_events.country_code` / `sale_predictions.country_code` (nullable, ISO alpha-2; `NULL` = global).
- Changelog: May 2026 — sale events are now market-aware.

## Out of scope (follow-ups)

- User-facing locale filtering on dashboard / brand detail.
- Prediction algorithm awareness of `country_code`.
- Pre-existing security linter warnings (SECURITY DEFINER function audit, leaked-password protection) — unrelated to this change.

## Regression checks

- Existing rows (all `country_code = NULL`) render as "Global" everywhere.
- Creating an event without picking a market still works (defaults to Global).
- Market filter "Global" returns only `NULL` rows; "Any" returns everything; specific code returns only that market.
- No changes to status/CRUD flows, RLS, or non-admin surfaces.
