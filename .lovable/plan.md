# The Get — UX, copy & terminology pass

A focused, frontend-only pass addressing all 10 issues in the review, with a **hybrid voice** (keep "house"/"signal" as brand voice but pair with plain-English anchors) and a clear stance that **The Get tracks brands/houses and their sale windows — not individual products**. Users click through to the house to see actual pieces.

No backend schema changes. No new tables. No notification pipeline. No item-level saving.

## Guiding decisions (from your answers)

- Cover all 10 issues + terminology.
- Hybrid terminology: keep `house` and `signal` editorially, anchor with plain words on first use and on action labels.
- **No products in The Get.** Sales belong to a brand and cover many pieces; the user clicks through. Anywhere the UI implies item-level saving must be reframed as house-level.
- Minimal first-run onboarding: require only 3 houses; everything else becomes optional/skippable.

## Terminology map (user-facing only — code identifiers unchanged)

| Today | Becomes |
|---|---|
| House (first use) | Fashion house / brand |
| House (subsequent) | House |
| Signal (explainer copy) | Recommendation / read |
| Buy now | Buy now |
| Sale likely soon | Wait for sale |
| Hold | Hold |
| Low signal | No clear read |
| Window | Expected sale window |
| Depth | Expected discount |
| Cadence | (kept, as supporting detail only) |
| The read | Kept, always paired with a concrete action verb |

## Changes by file

### 1. `src/components/SignalBadge.tsx` — action-first labels (issue #3)
Relabel: `soon → "Wait for sale"`, `low → "No clear read"`. Keep `buy → "Buy now"`, `hold → "Hold"`. SignalKind values unchanged.

### 2. `src/components/brand/SignalEditorial.tsx` and `src/components/RecommendationCard.tsx` (issues #1, #6)
- Rewrite editorial copy so every block ends in a concrete next step ("Open the sale page", "Add to watchlist", "Check back in ~2 weeks").
- **Remove the "Save signal" button** in `RecommendationCard` — it calls a no-op toast and confuses the user. Keep only the watchlist toggle as the primary action, plus a secondary `View at <House>` link to the brand's site if available, otherwise drop it.

### 3. `src/routes/brand.$id.tsx` (issues #4, #5)
- **Logged-out "Add to watchlist"**: replace the `toast(...)` call in `promptSignIn` with a direct `navigate({ to: "/login", search: { redirect: "/brand/" + brand.id } })`. No reliance on toasts (which are disabled).
- **Remove the "Pieces you're watching" mock block** (`getWatchedPieces` and its render). Replace with a single editorial panel: "See the pieces" → external link to the house's sale page or homepage (use existing `house.url` field if present in the DTO; otherwise omit the button and show "Open <House>" as a disabled hint with copy explaining we link out once available). Delete `WatchedPiece` type and `getWatchedPieces` helper.
- Audit copy on this page so "pieces" never appears as something The Get stores.

### 4. `src/routes/_authenticated/watchlist.tsx` (issue #4)
- Headline: `"The pieces you're waiting on."` → `"The houses you're watching."`
- Subhead: `"We'll let you know — gently — when the signal turns."` → `"We'll surface the read when a sale window opens for any of them."`
- Empty-state copy: `"add a house"` is already correct — keep, just align tone ("Start with a few favourite brands you'd buy on sale.").
- Count chip: `"{n} brands"` → `"{n} houses"` for consistency.

### 5. `src/components/WatchlistCard.tsx` + `src/lib/watchlist.functions.ts` (issue #9)
- Stop resolving via `getBrand()` from `src/data/brands.ts` mock. Resolve from the backend houses list already loaded in the watchlist route (pass the resolved house as a prop, or fetch by id via the brands server fn). Cards for unknown ids render a graceful "House no longer tracked — remove?" row instead of `return null`.
- Note: this is a UI/data-wiring change only, no schema change. The mock file can stay as a dev seed but is no longer the source of truth for the watchlist UI.

### 6. `src/routes/_authenticated/dashboard.tsx` (issue #8)
- Replace hardcoded `"Eight houses, watched closely. Three suggest waiting, two suggest acting now."` with a computed sentence derived from the loaded houses + signals, e.g. `"{n} houses, watched closely. {wait} suggest waiting, {buy} suggest acting now."` with graceful fallback when counts are 0.
- Eyebrow stays `"Today's signals"`; add plain anchor on first paint: subhead opens with `"Your buy/wait read across the houses you follow."`

### 7. `src/routes/_authenticated/setup.tsx` (issue #7)
- Change `valid` from `departments>=1 && houses>=3 && categories>=1` to **`houses.size >= 3`**.
- Mark Departments, Categories, Styles, Notifications steps as **optional** in copy ("Skip for now — refine later in your profile").
- Add a visible "Skip for now" button on each optional step that advances without selections.
- Search placeholder: `"Search houses…"` → `"Search fashion houses & brands…"` (plain-English anchor on first encounter).
- Keep the data model and persisted shape identical; only validation + copy changes.

### 8. `src/routes/_authenticated/setup.tsx` notifications block (issue #10)
- Relabel section: `"Notifications"` → `"Alert preferences (coming soon)"`.
- Add a small italic note: `"We'll honour these once email and SMS alerts ship."`
- **Hide the SMS toggle entirely** until a real pipeline exists (per workspace rule: don't promise undelivered features). Email + Weekly digest remain as preferences.

### 9. Landing / hero (`src/components/marketing/Hero.tsx`) (issue #1)
- Keep the editorial headline.
- Rewrite the sub-paragraph to lead with utility: `"Follow your favourite fashion houses. We'll tell you when a sale is likely, how deep it tends to go, and whether to buy now or wait."`
- Add plain anchor "fashion houses & brands" on first mention in any other marketing section that currently says only "houses".

### 10. Global "no dead actions" sweep
Grep for `toast(` in components and routes; any button whose only effect is a (now no-op) toast must either:
- be removed, or
- be wired to a real navigation / state change.
Known hits to address as part of the above: `RecommendationCard` Save signal, `brand.$id` logged-out watchlist prompt. Any others found get the same treatment.

## Out of scope (explicitly)

- No item/product saving, no new tables, no `saved_pieces`.
- No email/SMS sending infrastructure.
- No changes to `routeTree.gen.ts`, Supabase types, auth-middleware, or DB schema.
- No re-enabling of `sonner` / `<Toaster />`.
- No design-system overhaul; existing palette, fonts, spacing stay.

## Update to `AI_PROJECT_HANDOFF.md`

Append a short "Voice & terminology" subsection capturing the hybrid rule and the "no products in The Get" stance, and update the Known Debt section to mark the watchlist mock fallback (#9) and `getWatchedPieces` block as resolved once implemented.

## Verification checklist (post-build)

- Dashboard subhead reflects real counts on a seeded account.
- Watchlist headline reads "houses", card count says "houses", removed-house row renders for an unknown id.
- Brand detail: logged-out `Add to watchlist` navigates to `/login?redirect=...`; no "Save signal" button; no "Pieces you're watching" block.
- Setup: can complete with only 3 houses selected; SMS toggle absent; notifications section labelled "coming soon".
- `rg "toast\\("` shows no call site whose UX depends on a visible toast.
- SignalBadge renders "Wait for sale" and "No clear read" for `soon`/`low`.
