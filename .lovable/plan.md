## Plan — Import 92 UK sale events + extend sale-type enum

### 1. Extend the sale-type Zod enum (option C)
Edit `src/lib/admin-sales.functions.ts`:
- Add to `SALE_TYPES` (and `SALE_TYPE_LABELS`) the new types observed in the CSV:
  - `cyber_monday` — "Cyber Monday"
  - `black_friday_cyber_monday` — "Black Friday / Cyber Monday"
  - `new_year_sale` — "New Year sale"
  - `january_sale` — "January sale"
  - `easter_sale` — "Easter sale"
  - `good_friday_sale` — "Good Friday sale"
  - `bank_holiday_sale` — "Bank Holiday sale"
  - `end_of_season_sale` — "End of season sale"
  - `end_of_season_outlet` — "End of season outlet"
  - `outlet` — "Outlet"
  - `sample_sale` — "Sample sale"
  - `warehouse_sale` — "Warehouse sale"
  - `vip_sale` — "VIP sale"
  - `friday_sale` — "Friday sale"
  - `bash_days` — "Bash Days"
  - `we_made_too_much` — "We Made Too Much"
  - `fall_winter_archives` — "Fall/Winter archives"
  - `winter_archives` — "Winter archives"
  - `boxing_day_end_of_year` — "Boxing Day / End of year"
  - `special_prices` — "Special prices"
  - `limited_red_price_offer` — "Limited red-price offer"
  - `sale_open` — "Sale (open)"
  - `super_friday` — "Super Friday"
  - `black_friday_sale_items` — "Black Friday sale items"
  - `sale` — "Sale"

Final list will be the union of existing 11 + the new types actually present in the CSV (dedup, alphabetical-ish but preserve current order for the original 11 to keep admin UI stable).

No DB migration needed — `sale_type` has no DB-side constraint.

### 2. Fill the two missing `start_date` rows
Default UK dates for those event types:
- **Row 16 — ARKET `summer_sale` (UK)** → `start_date = 2024-06-21`, `end_date = 2024-07-31` (typical UK summer sale window: late June to end of July).
- **Row 65 — Massimo Dutti `friday_sale` (UK)** → `start_date = 2024-11-29`, `end_date = 2024-11-29` (single-day "Friday sale" aligned to Black Friday 2024 — Massimo Dutti commonly uses this label around BF).

Both will get an `admin_notes` line: `"Date inferred — source post had no explicit date."` so the provenance is preserved.

If you want different defaults, tell me before I run the insert.

### 3. Normalise values for the schema
Applied to all 92 rows on the way in:
- `country_code`: `GB` → `gb` (lowercase, matches `^[a-z]{2}$`).
- `status`: `verified` → `published`, `needs_review` → `draft`.
- `source_type`: `official` → `brand_site`, `editorial` → `press`, `social` → `manual_research`, `deal_site` → `price_tracker`.
- `sale_type`: kept as-is from the CSV (after step 1 they're all valid).
- `created_by`: `NULL` everywhere (CSV is blank; column is nullable).
- `id`, `created_at`, `updated_at`: taken from the CSV if present, otherwise defaults.
- `discount_min` / `discount_max`: kept as ints; blank → `NULL`.
- `category`, `admin_notes`, `end_date`: blank → `NULL`.

### 4. Execute the import
Two-step:
1. Apply the code change to `admin-sales.functions.ts` (enum extension only — no other behaviour change).
2. Run a single `INSERT` against `sale_events` with all 92 rows in one statement (via the insert tool). I'll print a short summary after: rows inserted, count by `status`, count by `sale_type`.

### Out of scope
- No UI changes to `SaleEventsTab` or `SaleEventDrawer` (the new sale types automatically appear in the existing dropdown because it reads from `SALE_TYPES`).
- No changes to predictions, brands, or any other table.
- No backfill of `created_by` (left `NULL`).
- No handoff doc update unless you want one (the import is data, not behaviour).

### What I need from you
1. Confirm the two default dates in step 2 (or give me replacements).
2. Implicit confirmation that the status (§3) and source-type (§3) mappings are fine — say so or override.

Once confirmed, switch me to build mode and I'll execute steps 1 → 4 in order.