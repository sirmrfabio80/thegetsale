## Context

On mobile, the `/admin/sales` page has two cramped spots:

1. **Tabs (`admin.sales.tsx`)** — the three `TabsTrigger`s (Sale events, Users & roles, System) sit inside a single `TabsList` row with fixed padding and uppercase letterspacing. On narrow viewports they wrap awkwardly and clip.
2. **Filters + table (`SaleEventsTab.tsx`)** — filter selects are fixed at `w-44` and the toolbar uses `flex-wrap items-end justify-between`, pushing the "Add sale event" button off-row. The 8-column `<Table>` overflows horizontally with no scroll affordance, and inline row actions ("Edit · Publish · Hide · Delete") collide.

Scope: presentation only, two files. No data, server, or filter logic changes.

## Approach

### 1. `admin.sales.tsx` — tabs

- Wrap `TabsList` in `overflow-x-auto` and let it be full width on mobile (`w-full md:w-auto`), with `flex-nowrap` so triggers scroll horizontally instead of wrapping.
- Shrink trigger padding on mobile (`px-3 py-2 md:px-4`) and keep current size from `md` up.
- Shorten "Users & roles" → "Users" on mobile via a `<span className="md:hidden">` / `hidden md:inline` swap to avoid truncation.
- Reduce h1 top padding on mobile (already `pt-16 md:pt-24` — keep) and ensure the eyebrow + title stay aligned.

### 2. `SaleEventsTab.tsx` — toolbar & filters

- Replace fixed `w-44` on each filter with `w-full` so the 2-col mobile grid (`grid-cols-2`) fills the row cleanly; keep `md:grid-cols-4` for desktop.
- Make the toolbar stack vertically on mobile: `flex-col items-stretch gap-3 md:flex-row md:items-end md:justify-between`. Filter grid becomes `w-full md:w-auto`. "Add sale event" becomes full-width on mobile (`w-full md:w-auto`).
- Result count + Clear filters row already wraps fine; keep as is.

### 3. `SaleEventsTab.tsx` — listing (the critical change)

The 8-column table is unusable on a 375px screen. Use a **responsive split**:

- **Mobile (`md:hidden`)**: render rows as stacked cards. Each card shows:
  - Top row: brand name (medium weight) + status pill on the right.
  - Meta line: `category · type` in muted small text.
  - Date line: `Start → End` (or "Start →" when no end) with discount badge on the right.
  - Action row at bottom: Edit · Publish/Hide · Delete as tap targets (≥44px), separated by thin border, wrapped with `flex-wrap gap-2`. Use existing button styles but bump height to `h-10` and add horizontal padding so they're tappable.
  - Wrap each card in `border border-border p-4` with `divide-y` between cards within a single `border` container, or stack `space-y-3` cards.
- **Desktop (`hidden md:block`)**: keep the existing `<Table>` exactly as is.

Shared row data (brand name resolution, discount formatting, status class) already lives in helpers — both views reuse them.

### 4. Loading / empty states

- Mobile cards reuse the same "Loading…" / "No sale events yet." copy, centred in a single bordered block.

### 5. Out of scope

- `SaleEventDrawer` (already a full-screen sheet on mobile via `w-full sm:max-w-xl`).
- `UsersRolesTab`, `SystemTab` internals — only the parent tab strip is touched.
- Filter behaviour, server functions, schema.

## Files

- **Edit**: `src/routes/_authenticated/_admin/admin.sales.tsx`
- **Edit**: `src/components/admin/SaleEventsTab.tsx`

## Verification

- Mobile (375px): tabs visible in one horizontally-scrollable row, no clipping. Filters fill the screen in a 2-col grid. "Add sale event" is full-width below the filters. Sale events render as readable cards with tappable actions.
- Desktop (≥768px): unchanged — same toolbar layout, same table.
- Tablet (768px): grid switches to 4 columns, table reappears, button moves back to the right.
- No console errors; existing toasts and mutations behave identically.
