## Plan: Client-side pagination for the dashboard brand list

Scope: paginate the already filtered + personalised list on the client. No server, query, or `BrandCard` changes. URL-driven page state, 12 cards per page.

### 1. Files modified

- `src/routes/_authenticated/dashboard.tsx` — only file touched.

No new files, no new deps. Reuses `src/components/ui/pagination.tsx` as-is.

### 2. Route-level `validateSearch`

Add to the existing `createFileRoute("/_authenticated/dashboard")` config:

- Install `@tanstack/zod-adapter` is unnecessary if it's already present; if not, use a plain `validateSearch` function (no new dep allowed). Schema:
  - `page`: coerce to integer; if missing, `NaN`, `<1`, or non-finite → `1`.
- Output type: `{ page: number }`.

Implementation will be a hand-rolled `validateSearch: (raw): { page: number } => { const n = Number((raw as any)?.page); return { page: Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1 }; }` to avoid a new dependency.

### 3. Reading & writing page state

- Read: `const { page } = Route.useSearch();`
- Write: `const navigate = Route.useNavigate();` then `navigate({ search: (prev) => ({ ...prev, page: next }), replace: true })`.
  - `replace: true` for filter-driven resets (don't pollute history).
  - Default `replace: false` for user-driven page clicks (back button works).

### 4. Filter-change → reset-to-1

Avoid a `useEffect` chain that races with `filtered.length`. Approach:

- Wrap each filter setter in a small handler that updates the filter state AND calls `navigate({ search: { page: 1 }, replace: true })` in the same handler. Setters affected: category filter buttons, search input `onChange`, `onlyMine` toggle, `toggleDepartment`, and the `Clear` departments button.
- This eliminates the need for a `useEffect` watching `[filter, q, onlyMine, departments]` and so avoids render loops.

### 5. Pagination derivation

After `filtered` is computed:

```text
const PAGE_SIZE = 12;
const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
const safePage = Math.min(Math.max(1, page), totalPages); // clamp
const startIdx = (safePage - 1) * PAGE_SIZE;
const visible = filtered.slice(startIdx, startIdx + PAGE_SIZE);
const rangeStart = filtered.length === 0 ? 0 : startIdx + 1;
const rangeEnd = startIdx + visible.length;
```

Render `visible` instead of `filtered` in the grid.

If `page !== safePage` (e.g. deep link to `?page=99`), call `navigate({ search: (p) => ({ ...p, page: safePage }), replace: true })` inside a `useEffect` keyed on `[page, safePage]`. Clamp rather than redirect to a 404 — keeps the UX calm.

### 6. Pagination control JSX

Rendered below the grid, only when `totalPages > 1`:

```text
<div ref={gridTopRef} />   // placed just above <section> grid
...grid...
{totalPages > 1 && (
  <div className="mt-10 flex flex-col items-center gap-3">
    <p className="eyebrow [font-variant-numeric:tabular-nums]">
      Showing {rangeStart}–{rangeEnd} of {filtered.length} brands
    </p>
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={...} aria-disabled={safePage === 1}
            className={safePage === 1 ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>
        {/* page numbers with ellipses — see below */}
        <PaginationItem>
          <PaginationNext ... />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  </div>
)}
```

Page-number rendering rule (compact, with `PaginationEllipsis`):
- Always show page 1, current ± 1, and last.
- Insert `PaginationEllipsis` between non-adjacent groups.
- For `totalPages ≤ 7`, show all numbers without ellipses.

Each `PaginationLink` uses `onClick` + `href="#"` with `preventDefault` (the shadcn component is an `<a>`). `isActive` set when `n === safePage`.

### 7. Scroll behaviour

- Add `const gridTopRef = useRef<HTMLDivElement>(null);` placed immediately above the brand `<section>` grid.
- On page click (Prev/Next/number), after navigating, call `gridTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });`.
- Do not scroll on the filter-driven reset (user is already interacting with the filter bar at the top).
- Do not scroll on first mount / refresh (avoid hijacking native scroll restoration).

### 8. Edge cases

- **Zero results:** `totalPages = 1`, pager hidden, existing empty state renders unchanged.
- **Single page:** pager hidden; range text also hidden (no value at 1–N of N when N ≤ 12).
- **`?page=99` (beyond last):** clamp to `totalPages` and rewrite the URL with `replace: true`. No 404.
- **`?page=abc` / `?page=-3` / `?page=1.7`:** `validateSearch` normalises to 1.
- **Filter shrinks pages while on page 4:** filter handlers already reset to 1 (§4), so this is handled before the clamp ever fires.
- **SSR / loader:** no change — `listHousesForDashboard` still returns the full set; slicing happens in the component after `useSuspenseQuery` resolves.

### 9. Test plan (manual)

1. Load `/dashboard` with no filters → page 1, 12 cards, pager shows `1 2 … N`.
2. Click `2` → URL becomes `?page=2`, grid top scrolls into view, cards 13–24 shown.
3. Refresh on `?page=3` → still on page 3, correct slice.
4. While on page 4, click a Department chip → URL becomes `?page=1` (replace, no extra history entry), grid resets.
5. Type in the search box → resets to page 1 on each keystroke (acceptable; debounce is out of scope).
6. Deep-link `?page=99` → clamps to last page, URL rewrites to actual last page, no error.
7. Apply a filter that returns ≤ 12 results → pager and range text both hidden.
8. Apply a filter that returns 0 results → existing empty state renders, no pager.
9. Browser back after paging 1 → 2 → 3 returns to page 2 then page 1 (history preserved for user-driven page clicks).
10. Keyboard: Tab into Prev/Next/numbers, Enter activates; disabled Prev on page 1 and disabled Next on last page are not focusable / have `aria-disabled`.

### Risks / notes

- Existing `useEffect` that persists `departments` back to setup is unaffected — it only watches `[hasSetup, departments, setup, save]`.
- Personalised sort runs over the full `brands` array before slicing, so "matched first" ordering is preserved across pages.
- No change to the query cache shape, so the memory fixes from the previous turn still hold.
- If you later want filters in the URL too, this same `validateSearch` schema extends cleanly — out of scope here.