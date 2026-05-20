## Context

`SaleEventDrawer` already has basic client-side checks and sonner toasts, but a few things make it feel rough:

- Validation only fires on submit; field errors don't clear as the user fixes them.
- A failing submit shows nothing at the top — only inline errors, easy to miss when scrolled.
- Server errors come back as a generic `e.message`, which for Zod issues looks like a JSON dump.
- Required fields aren't marked beyond a `*` and there's no `aria-invalid` for assistive tech.

Scope: only `src/components/admin/SaleEventDrawer.tsx`. No server, schema, or table changes — server-side validation already exists via the `SaleInput` Zod schema in `admin-sales.functions.ts`.

## Approach

### 1. Replace ad-hoc checks with a shared Zod schema

Define a `saleFormSchema` (zod) inside the drawer that mirrors the server `SaleInput` but works on the string form state:

- `brandId`: uuid, required ("Brand is required")
- `saleType`: enum from `SALE_TYPES`
- `startDate`: `YYYY-MM-DD`, required
- `endDate`: optional, `YYYY-MM-DD`, must be `>= startDate`
- `category`: max 80 chars
- `discountMin` / `discountMax`: optional, integer 0–90, max ≥ min
- `adminNotes`: max 2000 chars

Run it inside a single `validate(form)` helper that returns `{ data, errors }` so the submit path and live updates share one code path.

### 2. Live error clearing + aria

- Each input's `onChange` calls a small `setField(name, value)` helper that updates the form and removes that field's error from state if present.
- Pass `aria-invalid={!!errors.x}` and `aria-describedby` to inputs/selects that have an error.
- Add `*` styling for required field labels (`Brand`, `Sale type`, `Start date`).

### 3. Submit + toast flow

- Submit path: parse with zod. If invalid:
  - set `errors` map,
  - show a single `toast.error("Please fix the highlighted fields")`,
  - scroll the drawer body to top so the first error is visible.
- On success: keep existing success toast (`Sale event created` / `Sale event updated`).
- On server error: extract a friendlier message. If `error.message` looks like JSON (Zod issues passed through `throw new Error(error.message)`), try to parse and surface the first `message` field; otherwise fall back to the raw `message` and finally to a generic "Couldn't save sale event."

### 4. Error summary banner

Inline banner at the top of the drawer body when `Object.keys(errors).length > 0`: a thin bordered block (`border-destructive text-destructive`) listing how many fields need attention. Disappears as fields are corrected.

### 5. Out of scope

- Server functions, schemas, RLS.
- `SaleEventsTab` (its own toasts for delete / status already work).
- New dependencies — zod is already in the project.

## Files

- **Edit**: `src/components/admin/SaleEventDrawer.tsx`

## Verification

- Try to publish with empty form → toast "Please fix the highlighted fields", inline errors on Brand and Start date, banner at top, aria-invalid set.
- Fix Brand → its error clears immediately as you pick a value; banner count drops.
- Enter `endDate` before `startDate` → inline error on End date, blocked.
- Discount min 60 / max 40 → error on Max.
- Successful save → success toast, drawer closes, list refreshes (existing behaviour).
- Force a server failure (e.g. duplicate or RLS) → friendlier toast instead of raw JSON.
