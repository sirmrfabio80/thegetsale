## Goal

Make it fast to find saved brands on the watchlist page by adding a search input, a category-pill row, and pagination — matching the dashboard's look and behaviour. Department filters and sort already exist and stay as-is.

## Scope

Only `src/routes/_authenticated/watchlist.tsx`. No changes to `WatchlistCard`, server functions, or data model.

## Changes

1. **URL search params** (refresh-safe, shareable)
   - Add `validateSearch` to the route returning `{ page: number; q: string; cat: "All" | Category }`.
   - Use safe defaults (`page=1`, `q=""`, `cat="All"`) and coerce/clamp invalid values, same pattern the dashboard uses.
   - Read with `Route.useSearch()`; update with `Route.useNavigate()` using the function form `search: (prev) => ({ ...prev, ... })` so existing params (incl. department state stored via setup) are preserved.

2. **Search input**
   - Add a text input styled identically to the dashboard's ("Search a brand…"), matching against `brand.name` and `brand.tagline` (case-insensitive).
   - Typing updates `?q=` and resets `?page=1`.

3. **Category pills**
   - Same `FILTERS` list as the dashboard (`All`, `Womens`, `Mens`, `Accessories`, `Footwear`, `Jewellery`).
   - Filter visible items by `(brand.categories ?? []).includes(cat)` when `cat !== "All"`.
   - Pills sit alongside the existing Sort / Select controls; keep the existing Department pill row above untouched.
   - Clicking a pill updates `?cat=` and resets `?page=1`.

4. **Pagination**
   - Page size `12`, identical to dashboard.
   - Reuse `buildPageItems` helper logic (copy it into this file — small, avoids a premature shared util).
   - Reuse the shadcn `Pagination` components already imported in the dashboard.
   - Show "Showing X–Y of N houses" eyebrow above the pager.
   - Scroll to a `gridTopRef` on page change, like the dashboard.
   - Clamp out-of-range `?page=N` deep links via a `useEffect` that calls `navigate({ replace: true })`.

5. **Filter interaction with existing logic**
   - The new `q` and `cat` filters apply on top of the existing department filter, then existing sort runs, then pagination slices.
   - The existing "X houses · Sorted by …" count shows the post-filter total (matching today's behaviour).
   - Existing empty state ("No brands in {deptLabel}") still triggers when department filtering empties the list; add a second empty state for when `q`/`cat` empty the list, with a "Clear search & filters" reset button that navigates to `{ q: "", cat: "All", page: 1 }`.

6. **Select mode**
   - "Select all visible" continues to operate on the currently visible page only — no scope change. Selections survive page/filter changes (existing behaviour) until items disappear from the watchlist.

## Technical notes

- Use `zodValidator` + `fallback` (already the project pattern per the search-params skill) if zod is preferred; otherwise a hand-rolled `validateSearch` mirroring `dashboard.tsx` is fine and keeps the diff small. I'll follow whichever pattern the dashboard uses — currently hand-rolled — for consistency.
- Department filter state stays in component state synced from `setup` (unchanged). It is NOT moved into the URL in this task.
- No new dependencies, no changes to `WatchlistCard`, server functions, or types.

## Out of scope

- Moving department filters into the URL.
- Sort param in the URL (still localStorage).
- Any visual redesign of the cards or page header.
- Tests.

## Verification

- Type-check passes.
- `/watchlist?q=acne&cat=Womens&page=2` deep-links correctly and survives refresh.
- Typing in search resets to page 1; clicking a category pill resets to page 1.
- Out-of-range `?page=99` clamps to the last valid page.
- Empty-filter state shows a reset button that clears search + category.
- Department filter, sort, select mode, and remove flows still work.
- Update `AI_PROJECT_HANDOFF.md` watchlist section to note URL-backed search/category filters + pagination.
