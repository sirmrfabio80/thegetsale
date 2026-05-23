# Market selector — signup, profile, sale-event filtering

## 1. Data model

Add a `market` column to `public.profiles`:

- `market text` — nullable, lowercase ISO-3166-1 alpha-2, CHECK `^[a-z]{2}$`.
- Reuse the existing `MarketCode` curated list in `src/lib/markets.ts` (already used for `sale_events.country_code`) so signup, profile, and admin all share one vocabulary.

RLS already covers profiles (users read/update their own row); no policy change needed.

## 2. Shared UI component

New `src/components/MarketSelect.tsx`:

- Searchable combobox (shadcn `Command` + `Popover`, already in the project) over `MARKETS` from `src/lib/markets.ts`.
- Each row shows country flag emoji + label + ISO code.
- Controlled `value: MarketCode | null`, `onChange`.
- Accessible, keyboard-navigable, mobile-friendly. Calm/editorial styling consistent with existing fields.

## 3. Auto-detection helper

New `src/lib/detect-market.ts`:

- `detectMarket(): MarketCode | null`
- First try `navigator.language` / `navigator.languages` → parse region tag (e.g. `en-GB` → `gb`); only return if in the curated `MARKETS` allow-list.
- Fallback to a lightweight IP lookup via a server function `detectMarketFromIp` (`createServerFn`) that reads the request's `cf-ipcountry` / `x-vercel-ip-country` header (available on the worker runtime) — no external API call, no extra dependency. Returns `null` on miss.
- Never blocks the UI: locale runs synchronously, IP runs in the background and only sets the field if the user hasn't touched it yet.

## 4. Signup flow

The signup page currently uses OAuth (Google/Apple) and email/password through `GoogleAuthCard`. Two surfaces need the selector:

**a. Email/password signup (in-page):**
- Add `MarketSelect` to `GoogleAuthCard`'s signup mode, above the email field, pre-filled from `detectMarket()`.
- Required for the email "Create account" button — disabled until a market is chosen.
- Pass the selected market into `signUpWithEmail` and persist it to `profiles.market` immediately after `auth.signUp` succeeds (new server fn `setMyMarket`).

**b. OAuth signup (Google/Apple — leaves the site):**
- Capture the chosen market on the signup page into `sessionStorage` (`theget.pendingMarket`) before redirecting to the provider.
- In `auth.callback.tsx`, after session is established, if `profiles.market` is null and `sessionStorage` has a value, call `setMyMarket` and clear the key.
- The selector on the signup page is **required** before the Google/Apple buttons enable too, matching the spec ("must confirm or change the pre-selected value before completing signup").

This is the minimal way to honour the requirement without touching auth logic itself — the OAuth call signatures are unchanged; only the page that wraps them gates the buttons and stashes the value.

## 5. Profile page

In `src/routes/_authenticated/profile.tsx` (account settings section):

- Add a "Market" row with `MarketSelect`, hydrated from the profile.
- On change, call `setMyMarket` (new server fn) and invalidate the profile query. Calm inline saved state, no toast (per project guardrails).

New server fn in `src/lib/profile.functions.ts`:

```ts
export const setMyMarket = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ market: z.string().regex(/^[a-z]{2}$/).nullable() }).parse)
  .handler(...)
```

Extend `ProfileDTO` with `market: string | null` and `getMyProfile` to select it.

## 6. Server-side sale-event filtering

Update the two user-facing reads in `src/lib/brands.functions.ts`:

- `listBrandsWithSignals` (dashboard / watchlist): the `.from("sale_events")` query at line 119.
- The brand-detail history/timeline queries at lines 184 and 232.

Both functions already run under `requireSupabaseAuth`. Steps:

1. Load `profiles.market` for the current user once at the top of each handler (cheap; same supabase client).
2. If `market` is set, add `.or(\`country_code.eq.${market},country_code.is.null\`)` so the user sees their market's events plus global/unscoped ones (matches how admins author "Global" as `NULL`).
3. If `market` is `null`, return an empty events list along with a `needsMarket: true` flag in the DTO so the UI can render the prompt.

Dashboard (`src/routes/_authenticated/dashboard.tsx`), watchlist, and brand detail render an empty state with a CTA linking to `/profile` when `needsMarket` is true. No other UI changes.

Admin surfaces (`SaleEventsTab`, drawers) are unaffected — admins still see all markets.

## 7. Files

- New: `supabase/migrations/<ts>_add_profiles_market.sql`, `src/components/MarketSelect.tsx`, `src/lib/detect-market.ts`.
- Edited: `src/lib/markets.ts` (export `MARKETS` array if not already), `src/lib/profile.functions.ts` (+`setMyMarket`, `market` field), `src/lib/brands.functions.ts` (market filter + `needsMarket`), `src/components/marketing/GoogleAuthCard.tsx` (selector + gating + sessionStorage stash), `src/routes/auth.callback.tsx` (apply pending market), `src/routes/_authenticated/profile.tsx` (Market row), `src/routes/_authenticated/dashboard.tsx` + `watchlist.tsx` + `brand.$id.tsx` (empty-state prompt), `AI_PROJECT_HANDOFF.md`.
- Auto-regenerated: `src/integrations/supabase/types.ts`.

## 8. Out of scope

- Existing auth logic (`signInWith*`, `signUpWithEmail`) — unchanged.
- Layout components, marketing pages, admin UIs.
- Prediction algorithm market-awareness (separate slice).
- Backfilling existing accounts: existing users will see the empty-state prompt and set their market from `/profile`.

## 9. Risks & regression checks

- **OAuth users who skip the stash**: if `sessionStorage` is cleared between click and callback, market lands as null and the user is prompted on first dashboard load — acceptable, not a hard failure.
- **Existing users**: all have `market = NULL` post-migration, so dashboard renders the prompt. No data loss; admin sees no change.
- **Sale-event visibility regression**: published events with `country_code = NULL` (current state for all rows) remain visible to every market — keeps the dashboard from going empty for existing markets. Verify by listing sales with a test profile in `gb` and confirming both `gb` and `NULL` rows appear, and `us` rows do not.
- **IP detection on the worker runtime**: fall back to `navigator.language` if the header is missing; never block signup.
- **Private beta path**: unchanged — selector only renders in the active signup card.

## 10. Approval

Approve to switch to build mode and execute in this order: migration → shared selector + detection → profile fn + page → signup gating + callback stash → server-side filter + empty states → handoff doc.
