# Editorial polish: dashboard, brand cards, signal badges, brand detail

A pure UI/copy pass. No data, routing, or business-logic changes. No new dependencies. No background imagery or toasts.

## 1. `src/components/BrandCard.tsx`

- Add a thin left-border accent (`border-l-2`) whose colour comes from a per-signal map → `var(--signal-buy|soon|hold|low)`. Apply via inline `style={{ borderLeftColor: ... }}` on the `<Link>` so we can use the CSS variables already in `styles.css`.
- Bump house name from `text-2xl` → `text-[1.5rem]` (Instrument Serif already applied via `font-serif`).
- Bump metric value from `text-lg` → `text-[1.1rem]` and add `font-variant-numeric: tabular-nums` (via a `tabular-nums` utility class).
- Hover state: brighten left border (slightly higher-chroma oklch variant via a `:hover` style or a CSS custom property swap) + add `hover:shadow-[0_2px_12px_oklch(0_0_0/0.06)]`. Remove the existing `md:hover:-translate-y-px` transform per spec ("no scale transform").

## 2. `src/components/SignalBadge.tsx`

- Replace the round bullet `<span class="rounded-full">` with a 6×6px filled square (`h-1.5 w-1.5`, no rounding), colour from `var(--signal-{signal})`.
- For `buy`: keep the existing tinted bg/border/text using `--signal-buy` (already there, just verify the ~8% tint reads warm — current `/5` is fine).
- For `low`: switch border from `border` solid → `border-dashed`.
- Label typography is already 10px uppercase 0.18em tracking — confirm and leave.

## 3. `src/routes/_authenticated/dashboard.tsx`

- Change eyebrow copy: `"Today's signals"` → `"The Read · Today"`.
- After the headline paragraph and before the personalisation strip, add a hairline `<div class="hairline mt-10" />` followed by a one-line distribution summary in `.eyebrow` style: `"X BUY · Y SOON · Z HOLD · W LOW"`. Compute from `brands` in the existing `counts` useMemo (extend it to include `hold` and `low`).
- Reduce the gap between the Department filter row and the Category filter row: drop the second row's `mt-4` to `mt-2` (or wrap both in a single `space-y-2` block).
- Rename the `"Only my selections"` button label → `"My Houses"`.

## 4. `src/routes/brand.$id.tsx` (authenticated view only)

- Fix broken string at lines 153–154: render as `head to {brand.name} directly to browse what's on.` (add the missing space).
- Replace the "Brand link coming soon" label (lines 167–169) with a disabled ghost button:
  ```tsx
  <button type="button" disabled
    className="inline-flex h-11 items-center gap-2 border border-border px-5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground opacity-40 cursor-not-allowed">
    → Visit {brand.name}
  </button>
  ```

## 5. `src/components/RecommendationCard.tsx` (the Editor's note pull-quote)

- Add a thin left rule using `--signal-soon`: `border-l-2` with `style={{ borderLeftColor: 'var(--signal-soon)' }}` (and increase left padding so content doesn't shift).
- Bump headline from `text-3xl md:text-4xl` → `text-[2rem] md:text-[2rem]` Instrument Serif **italic** (add `italic`) so it reads as a pull-quote.

## 6. `src/routes/_authenticated/watchlist.tsx`

- Change empty-state headline at line 401 from `"Your watchlist is empty."` → `"Nothing on your watchlist yet. Add the houses you're watching."` (keep surrounding CTA copy as-is).

## 7. Handoff doc

- Append a short entry to `AI_PROJECT_HANDOFF.md` noting: editorial polish pass — per-signal left accents on BrandCard, square signal-badge markers + dashed border for `low`, dashboard masthead distribution line, "My Houses" rename, "The Read · Today" eyebrow, brand-detail copy + ghost-button fix, RecommendationCard pull-quote treatment, watchlist empty-state rewording.

## Out of scope (explicit)

- No changes to signal enum values, routing, server functions, or admin tab labels.
- No `routeTree.gen.ts`, no `src/integrations/supabase/*`.
- No `sonner` / `<Toaster />`.
- No background images, video, or decorative photography.

## Verification

- Capture `/dashboard` and `/brand/<id>` (authenticated, via existing preview session) before/after at the current viewport (1071px) to confirm: left accent renders per signal, badge square shows, `low` badge is dashed, distribution line reads correctly, hover lift has no transform, pull-quote left rule is amber-ish.
- Tabular-nums check: confidence/window values align vertically across two stacked cards.
