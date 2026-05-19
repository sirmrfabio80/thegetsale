## Personalise `/dashboard` from `/setup` selections

Read the user's saved houses, categories, and notification prefs and use them to **prioritise** signals on the dashboard — matched brands rise to the top, with an opt-in "Only my selections" toggle to hard-filter.

### Data shape reality check

The setup options and the mock dashboard brands don't share a vocabulary:

| | Setup | Dashboard brands |
|---|---|---|
| Houses | Real brand names (The Row, Prada, Loewe…) | Fictional houses (Maison Ardoise, North Room…) |
| Categories | Bags, Shoes, Ready-to-wear, Outerwear, Jewellery, Accessories | Womens, Mens, Accessories, Footwear, Jewellery |

So house-name matching won't yield hits against current mock data. The personalisation will be driven by **category mapping**, with house matching wired up correctly for when real brand data lands later.

### Category mapping (`src/data/categoryMap.ts`)

```ts
Bags          -> Accessories
Shoes         -> Footwear
Jewellery     -> Jewellery
Accessories   -> Accessories
Ready-to-wear -> Womens, Mens
Outerwear     -> Womens, Mens
```

A pure helper: `matchesSelection(brand, selectedHouses, selectedCategories) -> boolean`.

### Dashboard changes (`src/routes/dashboard.tsx`)

1. **Hydrate**: `useEffect` reads `loadSetup()` on mount into local state (`selectedHouses: Set<string>`, `selectedCategories: Set<string>`). SSR-safe — no setup means no personalisation, page works exactly as today.

2. **Sort, don't hide (default)**: extend the `useMemo` so matched brands come first, unmatched after, original order preserved within each group. Each matched `BrandCard` gets a small `For you` eyebrow tag (see component change below).

3. **"Only my selections" toggle**: a small pill next to the category filters, only rendered when setup exists. When on, unmatched brands are filtered out entirely. Default off.

4. **Personalisation banner**: thin row above the filter bar.
   - If setup exists: `Personalised from your setup · N houses · M categories` + small `Edit` link → `/setup`.
   - If no setup exists: `Personalise this feed` + `Set up signals` link → `/setup`.
   - Calm, single-line, uses existing eyebrow/muted-foreground treatment. No card, no banner box.

5. **Empty states**: if "Only my selections" hides everything, copy becomes `Nothing in your selections today. Loosen the filter or edit your setup.` with a link to `/setup`.

### `BrandCard` change

Add an optional `forYou?: boolean` prop. When true, render a tiny `For you` eyebrow label in the card's top-right (matching the existing card type). No layout shift when absent — uses the same row as the existing signal pill.

### Why prioritise rather than filter by default

The setup brief promised "personalise homepage suggestions, dashboard". Hard-filtering on first load risks showing a near-empty page (especially given the mock-data mismatch) and hides the broader market read that's core to the product's promise. Prioritising preserves the editorial feel while still answering "what's most relevant to me?".

### Files

- Add: `src/data/categoryMap.ts` (mapping + `matchesSelection` helper)
- Edit: `src/routes/dashboard.tsx` (hydrate, sort, banner, toggle, empty states)
- Edit: `src/components/BrandCard.tsx` (optional `forYou` badge)

### Out of scope

- No changes to `/setup`, `/watchlist`, `/brand/$id`, or the `brands` data file.
- No notification-pref-based behaviour on the dashboard (those affect email/SMS, not the feed).
- No replacing mock brands with the real setup brand list — separate, larger change.