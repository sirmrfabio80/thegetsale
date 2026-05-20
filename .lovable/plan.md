## Context

`/admin/sales` already has a working sale-event listing with filters and a modal Dialog form. The user wants the add/edit experience as a **drawer** (slide-in panel), plus a couple of listing polishes. Server functions (`listSaleEvents`, `createSaleEvent`, `updateSaleEvent`, `setSaleEventStatus`, `deleteSaleEvent`, `listBrandOptions`) are already in place with Zod validation, RLS-backed admin checks, and DTO mapping — no backend changes needed.

## Approach

### 1. Replace the Dialog with a side Sheet (drawer)

Rewrite `src/components/admin/SaleEventDialog.tsx` to use shadcn `Sheet` instead of `Dialog` so it slides in from the right. Keep the same props, validation, and submit behaviour so the parent (`SaleEventsTab`) needs no API change — just the import stays the same.

- `<Sheet>` with `side="right"`, width `w-full sm:max-w-xl`, no border-radius.
- `SheetHeader` with `SheetTitle` (serif) + small "Draft" / "Published" / "Hidden" status hint.
- Body uses the existing 2-col grid (brand, sale type, category, status, dates, discount min/max, admin notes).
- Sticky `SheetFooter` at the bottom with: Cancel · Save as draft · Publish (loading spinners stay).
- Keep current Zod-mirroring client validation and field-level error messages.
- Rename the file `SaleEventDrawer.tsx` and update the import in `SaleEventsTab.tsx`. Component export stays the same name pattern.

### 2. Listing polish

Small, surgical edits to `SaleEventsTab.tsx`:

- Add a "Clear filters" link next to the filter row, visible only when at least one filter is set.
- Show a result count under the filters: `{n} sale events`.
- Disable Publish/Hide buttons during their mutation more visibly (spinner text "Updating…" on the affected row only — track `pendingId` locally).
- Keep the existing AlertDialog delete confirmation.

No filter logic changes — server already handles `brandId / category / saleType / status`.

### 3. Out of scope

- Backend / server function changes.
- Schema, RLS, or new tables.
- Predictions, dashboard, notifications.

## Files

- **Edit/rename**: `src/components/admin/SaleEventDialog.tsx` → `SaleEventDrawer.tsx` (Sheet-based).
- **Edit**: `src/components/admin/SaleEventsTab.tsx` (import path, clear-filters link, count, per-row pending state).

## Verification

- Open `/admin/sales`: list renders, filters narrow results, "Clear filters" appears when filters active and resets state.
- Click "Add sale event": drawer slides from the right; required-field errors block save; "Save as draft" and "Publish" each persist and close the drawer with a toast.
- Click "Edit" on a row: drawer opens prefilled; changes save.
- Publish/Hide on a row: only that row shows the pending state; toast on success; status badge updates.
- Delete with confirm still works.
- Non-admin direct-link to `/admin/sales` still redirects to `/dashboard` (existing guard untouched).
