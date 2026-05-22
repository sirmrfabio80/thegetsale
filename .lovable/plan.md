## Add four houses to the `brands` table

Insert four new rows into `public.brands`. All will be `is_active = true`. No schema changes, no code changes — just a data insert via the insert tool.

### Proposed field values

| Field | COS | Sézane | Octobre | ARKET |
|---|---|---|---|---|
| `name` | COS | Sézane | Octobre Éditions | ARKET |
| `slug` | `cos` | `sezane` | `octobre-editions` | `arket` |
| `category` | Womens | Womens | Mens | Womens |
| `house_group` | Contemporary | Contemporary | Contemporary | Contemporary |
| `country` | Sweden | France | France | Sweden |
| `website_url` | https://www.cos.com | https://www.sezane.com | https://www.octobre-editions.com | https://www.arket.com |
| `tagline` | Modern, considered essentials. | Parisian ready-to-wear, effortless. | Quiet Parisian menswear. | Considered everyday wardrobe, Stockholm. |
| `description` | H&M-group label offering minimalist, design-led ready-to-wear and accessories. | Independent Parisian brand known for feminine staples and limited drops. | Menswear counterpart to Sézane, understated French tailoring and knitwear. | H&M-group label focused on durable, functional pieces across men, women, and home. | 
| `editorial_copy` | null | null | null | null |
| `is_active` | true | true | true | true |

### Notes on choices

- **Category**: COS, Sézane, and ARKET have full womens lines (and mens) — defaulting to `Womens` matches the dominant audience signal. Octobre is mens-only. The existing `category` column appears to hold a single primary category, consistent with current rows.
- **House group**: All four sit in the "Contemporary" tier — accessible price points, regular drops, not heritage/quiet-luxury. This matches existing `HOUSE_GROUPS` values in `src/lib/admin-houses.functions.ts`.
- **Slug**: lowercase, hyphenated, no accents — matches the `^[a-z0-9]+(?:-[a-z0-9]+)*$` regex enforced by `HouseInput`.
- **Tagline**: short, in the editorial voice already used in `src/data/brands.ts`.
- `id`, `created_at`, `updated_at` use table defaults.

### Out of scope
- No sale events, predictions, or editorial copy are created. Those can be added later via the admin UI.
- No category override — if you want Octobre flagged differently or Sézane/ARKET/COS as `Mens` instead, say so before approval.

### Approval needed
Confirm the values above (especially category and house_group), and I'll run the insert.