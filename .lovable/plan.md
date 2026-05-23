# Brand categories + localised URLs — investigation & plan

## 1. What I found

### `brands.category` is single-value

- Schema: `brands.category text` (nullable). One value per brand.
- `Category` TS union: `"Womens" | "Mens" | "Accessories" | "Footwear" | "Jewellery"` (`src/data/types.ts`).
- Current data: 33 of 34 seeded houses are `"Womens"`, 1 is `"Mens"`. No brand currently expresses multi-category reality (e.g. Reiss = womens + mens + accessories; lululemon = womens + mens; Marni / Acne / Isabel Marant = womens + mens + accessories; etc.).
- Read sites:
  - `src/lib/brands.functions.ts` — `BRAND_COLS`, `toBrand()` mapper, `searchBrands()` admin query
  - `src/data/categoryMap.ts` — `brandDepartment(b)` (Womens→Womenswear, Mens→Menswear, else Unisex) and `matchesSelection()` (checks `mappedCategories.has(brand.category)`)
  - `src/routes/_authenticated/dashboard.tsx` — filter chips: `b.category === filter`; "1 category / N categories" copy
  - `src/components/BrandCard.tsx`, `src/components/WatchlistCard.tsx`, `src/routes/brand.$id.tsx` — display `{brand.category} · {brandDepartment(brand)}`
- `product_categories.maps_to text[]` already uses the array pattern as the canonical taxonomy bridge (e.g. `Bags → {Accessories}`, `Ready-to-wear → {Womens, Mens}`).
- `sale_events.category` is per-sale (which slice of the brand is on sale) and is a separate concern — **do not change**.

### `website_url` has US-defaulted entries

Stored URLs that force a US destination:

- Claudie Pierlot → `https://us.claudiepierlot.com`
- Maje → `https://us.maje.com`
- ME+EM → `https://us.meandem.com`
- Sandro → `https://us.sandro-paris.com`
- lululemon → `https://shop.lululemon.com` (this one is the actual global storefront — leave)

There is no locale-resolution layer. UI just renders `brand.websiteUrl` as the "Visit site" link.

## 2. Is this a real bug?

**Yes — two real bugs.**

1. **Single `category` mis-models reality.** Most premium houses sell across womenswear, menswear, and accessories simultaneously. The current shape forces a wrong choice, breaks dashboard filtering (a user filtering "Mens" sees only 1 house even though many of the seeded houses sell menswear), and prevents accurate personalisation against `user_setup.categories`.
2. **US-defaulted URLs** route non-US users to the wrong storefront. This is a UX and trust regression for a premium-fashion product positioned for an international audience.

## 3. Recommended data model

### Categories → `text[]` on `brands`

Pick `categories text[] not null default '{}'` over a join table because:

- Categories are a small closed enum (5 values), no per-relationship metadata needed.
- The codebase already uses `text[]` for the same shape elsewhere (`product_categories.maps_to`, `user_setup.categories/styles/houses/departments`).
- Filtering stays a one-liner (`.contains('categories', [filter])` server-side, `arr.includes(filter)` client-side); no joins, no N+1.
- A `brand_categories` join would add ceremony with no payoff at this scale.

Keep the old `category` column during migration to preserve data, then drop in a follow-up once code is cut over. Research each brand and add the missing categories. Add also the brand **Weekend Max Mara.**

### URLs → keep canonical + add `brand_links` for locales

- `brands.website_url` stays as the **canonical/global URL** (no `/us`, no country subdomain when a global one exists).
- New table `brand_links (brand_id uuid, country_code text, url text, primary key (brand_id, country_code))` for per-country overrides.
- Resolution helper picks: `brand_links` for user locale → else canonical `website_url`.
- User locale: read from browser `navigator.language` for now (cheap, no extra deps); leave a clean seam to swap to a stored `profiles.country_code` later.

## 4. Migration plan

**DB migration (single migration file):**

1. `alter table brands add column categories text[] not null default '{}';`
2. Backfill: `update brands set categories = array[category] where category is not null and category <> '';`
3. Create `brand_links` table + RLS (read for authenticated, admin-manage), matching the `brands` policy pattern.
4. Index: `create index brands_categories_gin on brands using gin (categories);`
5. Leave `brands.category` in place for one release as a deprecated mirror. Drop in a follow-up migration after code is verified.

**Data fix (insert tool, separate step):**

- Rewrite the 4 US-defaulted `website_url` values to canonical globals:
  - Claudie Pierlot → `https://www.claudiepierlot.com`
  - Maje → `https://www.maje.com`
  - ME+EM → `https://meandem.com`
  - Sandro → `https://www.sandro-paris.com`
- Seed `brands.categories` with realistic multi-values for the 34 seeded houses (e.g. Reiss = Womens, Mens, Accessories; Marni = Womens, Mens, Accessories, Footwear; pure womenswear houses stay `{Womens}`).
- Optional: seed `brand_links` with `us` overrides where the US site is meaningfully different from the canonical.

## 5. Files likely affected

- `src/data/types.ts` — `Brand.category: Category` → `categories: Category[]`
- `src/lib/brands.functions.ts` — `BRAND_COLS`, Zod row schema, `toBrand()` mapper, `searchBrands` select
- `src/data/categoryMap.ts` — `brandDepartment()` (derive from array; if both Womens+Mens → "Unisex"), `matchesSelection()` (set intersection)
- `src/routes/_authenticated/dashboard.tsx` — filter chip predicate, "N categories" counter
- `src/components/BrandCard.tsx`, `src/components/WatchlistCard.tsx`, `src/routes/brand.$id.tsx` — render joined list ("Womens · Mens · Accessories") with `brandDepartment` derived from array
- New: `src/lib/brand-links.ts` (resolver helper) — pure client util, no new server fn needed for v1
- Admin: no admin UI currently edits `brand.category`, so admin forms are unaffected for v1. (Editing categories from the admin UI can be a follow-up.)
- **Unchanged**: `sale_events.category`, `admin-sales.functions.ts`, `SaleEventDrawer`, `product_categories` taxonomy, generated `types.ts` (auto-regens).

## 6. Risks & regression checks

**Risks**

- Dashboard filter logic change could double-count a house under multiple chips. Counter must use distinct house IDs.
- `brandDepartment()` semantics shift: `{Womens, Mens}` should map to "Unisex" — verify existing copy on BrandCard / WatchlistCard / detail still reads cleanly.
- During the transition window both `category` (singular) and `categories` (array) coexist — UI must read only `categories`.
- URL changes for 4 houses: verify each canonical actually serves the brand's global homepage (no redirect loop to `/us`).

**Regression checks**

- Dashboard renders with old single-category data backfilled into array (should look identical before reseed).
- Filter chips: "Womens" still shows all womenswear houses; "Mens" now shows every house that includes Mens.
- Watchlist + brand detail render category list without layout break on long lists.
- `matchesSelection()` against `user_setup.categories` still returns the same set for users who selected a single category.
- "Visit site" link on brand detail opens the canonical URL; if `navigator.language` starts with `en-US` and a `brand_links` US row exists, it picks the US URL.
- No console errors; types compile after `types.ts` regen.

## 7. Implementation plan (for approval)

**Step A — DB migration** (one migration call)

- Add `brands.categories text[] not null default '{}'` + GIN index
- Backfill from existing `category`
- Create `brand_links` table + RLS policies (auth read, admin manage) + updated_at trigger

**Step B — Data update** (insert tool)

- Rewrite the 4 US-defaulted `website_url` values
- Populate `brands.categories` for the 34 seeded houses with realistic multi-category values
- (Optional) seed a handful of `brand_links` US overrides where genuinely needed

**Step C — Code cutover** (small, surgical edits)

1. `src/data/types.ts`: `Brand.categories: Category[]`
2. `src/lib/brands.functions.ts`: select `categories`, map to `categories`; keep returning array
3. `src/data/categoryMap.ts`: `brandDepartment` derives from array (W+M ⇒ Unisex), `matchesSelection` uses array intersection
4. `BrandCard` / `WatchlistCard` / `brand.$id.tsx`: render `categories.join(" · ")` with `brandDepartment(brand)`
5. `dashboard.tsx`: filter predicate `b.categories.includes(filter)`; counter uses distinct brand IDs
6. New `src/lib/brand-links.ts`: `resolveBrandUrl(brand, links, locale)` pure helper; wire into the "Visit site" CTA on brand detail
7. Fetch `brand_links` rows for the current brand alongside the brand fetch in the detail route loader/server fn

**Step D — Follow-up (separate PR, not in this plan)**

- Drop `brands.category` once code has been live for one release
- Admin UI for editing `categories` and `brand_links`

If you approve, I'll execute A → B → C in that order, in a single build pass, with regression checks against the dashboard, watchlist, and a brand detail page.