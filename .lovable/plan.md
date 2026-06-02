
# Editorial visual elevation of The Get

Visual-only pass. No changes to data fetching, `createServerFn` logic, auth, RLS, route logic, or the signal enum strings (`buy|soon|hold|low` are persisted). Tokens added to `src/styles.css` only (light; dark out of scope). Toast shim stays a no-op; no `sonner`, no `<Toaster/>`. No edits to `src/routeTree.gen.ts` or `src/integrations/supabase/*`.

The dashboard currently reads flat because all mock houses are in the `low` state, so the existing `--signal-*` palette and the metric grid never render. Colour and motion must come from the signal language itself, not added decoration.

---

## 1. Signal palette — concrete oklch values

Background ref: `--background: oklch(0.975 0.008 80)` (warm off-white ≈ #f6f3ec, L ~96.6).
Each signal gets a **text/ink** token (badge text, numerals) and a **surface wash** token (card tint). Border = ink at low alpha. `low` keeps no wash.

| Token | Before | After — ink (oklch) | After — wash (oklch) | Role |
|---|---|---|---|---|
| `--signal-buy` | `oklch(0.45 0.06 130)` | `oklch(0.42 0.09 145)` deep botanical green | `--signal-buy-wash: oklch(0.96 0.025 140)` | Buy now |
| `--signal-soon` | `oklch(0.58 0.08 60)` | `oklch(0.55 0.10 70)` warm ochre | `--signal-soon-wash: oklch(0.965 0.028 75)` | Wait for sale |
| `--signal-hold` | `oklch(0.62 0.02 70)` | `oklch(0.48 0.045 250)` slate-blue | `--signal-hold-wash: oklch(0.96 0.012 240)` | Hold |
| `--signal-low`  | `oklch(0.7 0.012 75)`  | `oklch(0.60 0.008 75)` muted stone | — (no wash) | No clear read |

Contrast vs background:

| Token | Text contrast | Graphic/UI contrast |
|---|---|---|
| buy ink  | ~7.4 : 1 ✅ AA body | ✅ |
| soon ink | ~4.8 : 1 ✅ AA body | ✅ |
| hold ink | ~5.9 : 1 ✅ AA body | ✅ |
| low ink  | ~3.4 : 1 — used only for eyebrow/dot, never long body copy | ✅ for dot |
| washes vs bg | ~1.05 : 1 (intentionally near-invisible tint, decorative only) | n/a |

Register all four ink tokens **and** the three wash tokens in the `@theme inline` block (`--color-signal-buy`, `--color-signal-buy-wash`, …) so Tailwind utilities resolve. `SignalBadge`'s `tones` map is rewritten to read the new tokens; border uses ink at `/40`, background uses the wash token directly (no `/[0.08]` math).

---

## 2. Active-card treatment (BrandCard, no parallel component)

Branch on `brand.signal` inside the existing `BrandCard`:

- `low` → unchanged: quiet card, no wash, single "Awaiting signal · cadence calibrating" line. Left rail keeps `--signal-low`.
- `buy | soon | hold` → apply tinted wash via `style={{ backgroundColor: 'var(--signal-' + brand.signal + '-wash)' }}` on the inner `<Link>`, plus the existing 3-stat Confidence/Window/Depth grid (tabular-nums already present). Left rail retints to the new ink token (existing `SIGNAL_ACCENT` map kept; values updated).

No new component. `RecommendationCard` and `WatchlistCard` reuse the same wash via the same `signal !== 'low'` branch.

---

## 3. Signal rails — per-component inventory (current state → change)

| Component | Current rail | Change |
|---|---|---|
| `BrandCard.tsx` | Has signal rail via `SIGNAL_ACCENT` map (`border-l-2` + dynamic colour) | **Keep**; retint to new ink tokens |
| `RecommendationCard.tsx` | Hard-codes `var(--signal-soon)` left border (line 19) | **Make dynamic**: `var(--signal-{brand.signal})` |
| `brand/SignalEditorial.tsx` | No signal rail (`border border-border bg-card` only) | **ADD** left rail in `var(--signal-{brand.signal})` |
| `WatchlistCard.tsx` | No signal rail (border toggles only for selection state) | **ADD** left rail in `var(--signal-{brand.signal})` + wash branch |

---

## 4. Distribution meter (dashboard)

Replace the eyebrow line `{counts.buy} Buy · {counts.wait} Soon · {counts.hold} Hold · {counts.low} Low` with a thin segmented bar above the caption.

```text
┌────────────────────────────────────────────┐  height: 6px, hairline border
│ buy │  soon  │ hold │     low (rest)       │  segments coloured with ink token
└────────────────────────────────────────────┘
  3 Buy · 12 Soon · 8 Hold · 22 Low   ← tabular-nums caption stays
```

- New `src/components/SignalDistribution.tsx`. **Props match the dashboard shape: `counts: { buy; wait; hold; low; total }`** — the dashboard counts object keys soon as `wait`, naming the prop the same avoids a rename churn.
- Pure CSS flex; widths = `flex: count`. Segments use `bg-[color:var(--signal-{name})]` (ink token).
- Each segment animates `transform: scaleX(0) → scaleX(1)`, `transform-origin: left`, 600ms `cubic-bezier(0.2,0.7,0.2,1)`, staggered 80ms via `animation-delay`. Disabled under reduced motion.

---

## 5. Confidence arc (brand detail)

In `SignalEditorial`'s top eyebrow rail, where `Confidence X/100` lives, mount a small radial arc beside the number.

- New `src/components/ConfidenceArc.tsx`. Inline SVG ~28px square, stroke 2px. Track in `--border`; progress stroke in `var(--signal-{signal})`. Animate `stroke-dashoffset` full → target over 900ms ease-out.
- Numeric `{score}/100` **stays as text** beside the arc — signal is never colour-only.
- Count-up via a small `useCountUp(value, duration)` hook driven by `requestAnimationFrame`, integer rounding, `[font-variant-numeric:tabular-nums]`.
- `prefers-reduced-motion`: render final state instantly, no rAF loop.

---

## 6. Motion system (CSS-only, no Framer/GSAP)

All keyframes added to `src/styles.css`. A single shared IntersectionObserver via `src/hooks/use-reveal.ts` (rootMargin `0px 0px -10% 0px`, threshold 0.05; adds `is-visible` on intersect, disconnects on unmount).

Pieces:

1. **Staggered card reveal** — `BrandCard` root gets `reveal-on-scroll` with initial `opacity-0 translate-y-[6px]`. Stagger via `style={{ animationDelay: \`${(index % 6) * 60}ms\` }}` from the dashboard map. 400ms fade+translate-y on `.is-visible`.
2. **Count-ups** — `useCountUp` reused by `ConfidenceArc` and the BrandCard stat grid `Confidence %` value.
3. **Hover hairline accent** — `BrandCard` adds a pseudo `::after` (1px hairline) along the bottom, `scale-x-0 → scale-x-100` on `md:group-hover`, `transform-origin: left`, 250ms ease-out. **No transform on the card itself.**
4. **Page cross-fade** — `PageLayout`'s `<main>` wraps `children` in a `page-fade` div keyed off pathname via `useRouterState`. 200ms opacity 0→1 on key change. Opacity-only, no layout shift.

Single guard at the bottom of `styles.css`:

```css
@media (prefers-reduced-motion: reduce) {
  .reveal-on-scroll, .stagger-item, .meter-fill, .arc-fill,
  .page-fade { animation: none !important; opacity: 1 !important; transform: none !important; }
}
```

No new dependencies. Existing transitions kept.

---

## 7. Depth / texture

- **Paper grain** — single inline-SVG noise via CSS background on `body::before`: `position: fixed; inset: 0; pointer-events: none; mix-blend-mode: multiply; opacity: 0.035; z-index: 0;`. SVG inlined as data-URI in `styles.css` (no network, no asset file). Content above on `z-10`.
- **Elevation scale** as tokens:
  - `--shadow-1: 0 1px 0 0 oklch(0 0 0 / 0.04)` (hairline rest)
  - `--shadow-2: 0 2px 12px -6px oklch(0 0 0 / 0.08)` (card hover — promote the inline value currently used by `BrandCard`)
  - `--shadow-3: 0 12px 40px -16px oklch(0 0 0 / 0.12)` (editorial band, ConfidenceArc card hover)
- Radius stays `0.25rem`. No rounded-2xl drift.

---

## 8. Logos (BrandLogo)

- Real `logoUrl` mark rendering (Logo.dev wired upstream in `brands.functions.ts`) is **unchanged**.
- Monogram fallback only: deterministic tint derived from a hash of `name`. Six pre-declared classes `.bg-mono-1` … `.bg-mono-6` defined in `styles.css`, each backed by an oklch token at L≈0.92 / C≈0.02 in a constrained warm/cool band. Glyph stays `text-foreground/70`.
- Implementation: tiny pure helper `hashToTintClass(name)` returning one of the six class names.
- **Do not thread `house_group` through props in this pass.** `Brand` and `BrandLogo` only carry `name`/`logoUrl` today; group plumbing is a separate change. Name-hash gives stable, calm differentiation now without touching the DTO.

---

## 9. Editorial header band (optional, default ships)

Slot at the top of the dashboard, above the "The Read · Today" eyebrow. New `src/components/dashboard/EditorialBand.tsx`.

- Full container width, height `clamp(160px, 22vw, 240px)`, hairline border, `--radius`, paper-grain layered on top (heavier, 0.06 opacity).
- Default asset: a single procedural SVG (warm gradient + soft fabric-weave hatch). No people, no photography. Lives at `src/assets/editorial-band-default.svg`, imported as URL.
- Headline ("Your buy/wait read.") overlays bottom-left on a `bg-background/70 backdrop-blur` plate so it stays legible regardless of asset luminance.
- Props: `imageUrl?: string; alt?: string; eyebrow: string; headline: string`. **Swap-ready slot. No upload UI, no admin, no storage in this pass.** A later phase only needs to pipe an admin-set URL into `imageUrl`.
- Mobile (375px): band collapses to ~160px, headline left-aligned, no horizontal scroll.
- Dashboard wiring: replace the current `<section className="pt-16 md:pt-24">…headline…</section>` with `<EditorialBand>` followed by the existing distribution meter + counts paragraph. The `needsMarket` notice stays above the band, unchanged.

---

## Constraints (locked)

- Visual-only. No data fetching, `createServerFn`, auth, RLS, route logic changes. Signal enum casing untouched.
- No edits to `src/routeTree.gen.ts` or `src/integrations/supabase/*`.
- No `sonner`, no `<Toaster/>`. `src/lib/toast` remains a no-op shim.
- house/brand copy split preserved. Empty/error/fallback copy still leads with buy-vs-wait action, not mood.
- Tokens added in `src/styles.css` (light only). No scattered raw colour values inline.
- Accessibility: ≥4.5:1 contrast for text, ≥3:1 for meter/arc/borders against the off-white background. Text label beside every signal colour. All motion gated behind `prefers-reduced-motion: reduce`.
- Mobile-first. No horizontal scroll at 375px. Reuse and parameterise existing components; do not duplicate.

---

## Files touched (presentational only)

- `src/styles.css` — new ink + wash signal tokens, `@theme inline` registrations, `--shadow-1/2/3`, `.bg-mono-1…6`, paper-grain `body::before`, keyframes (`reveal`, `meter-fill`, `arc-fill`, `page-fade`), single reduced-motion guard.
- `src/components/SignalBadge.tsx` — `tones` map reads new tokens.
- `src/components/BrandCard.tsx` — wash branch + hairline-accent `::after` + `reveal-on-scroll`.
- `src/components/RecommendationCard.tsx` — left rail made dynamic; wash branch.
- `src/components/WatchlistCard.tsx` — **add** left rail; wash branch.
- `src/components/brand/SignalEditorial.tsx` — **add** left rail; mount `ConfidenceArc`.
- `src/components/BrandLogo.tsx` — monogram tint via `hashToTintClass(name)`.
- `src/components/PageLayout.tsx` — `page-fade` wrapper on `<main>` children.
- `src/components/SignalDistribution.tsx` — NEW.
- `src/components/ConfidenceArc.tsx` — NEW.
- `src/components/dashboard/EditorialBand.tsx` — NEW (+ default procedural SVG asset).
- `src/hooks/use-reveal.ts` — NEW.
- `src/hooks/use-count-up.ts` — NEW.
- `src/routes/_authenticated/dashboard.tsx` — header swapped for `EditorialBand` + `SignalDistribution`; stagger index passed to `BrandCard`.
- `src/routes/brand.$id.tsx` — no logic change; `SignalEditorial` picks up `ConfidenceArc` internally.

Untouched per constraints: `src/routeTree.gen.ts`, `src/integrations/supabase/*`, all `*.functions.ts`, `src/lib/toast.ts`, auth and route configs.

---

## Out of scope (separate prompts)

- Phase-2 admin upload for the band image (storage bucket + `ensureAdmin` server fn + SettingsTab UI).
- Replacing the `"Lorem ipsum"` OG/Twitter description in `src/routes/__root.tsx` before a public launch.
- Dark-mode tokens.
- Threading `house_group` through `Brand`/DTO for group-based logo tinting.

---

## Verification after build

1. All four signal states render — temporarily override a few houses to `buy`/`soon`/`hold` in dev to confirm wash + metric grid + retinted rail; `low` stays the quiet single line. Do not commit the override.
2. Distribution meter fills animate on dashboard load; tabular caption matches counts.
3. Confidence arc on `/brand/$id` counts up; `{score}/100` text still present beside it.
4. DevTools → Rendering → "Emulate prefers-reduced-motion: reduce" → meter static, cards visible without fade, arc at final state, no page cross-fade.
5. Lighthouse / axe contrast pass on SignalBadge text and meter/arc against the off-white background.
6. 375px: no horizontal scroll on dashboard, brand detail, watchlist; header band collapses cleanly.
7. Guardrails intact: no `sonner`/`<Toaster>`, no edits under `src/integrations/supabase/*` or `routeTree.gen.ts`, signal enum strings unchanged.
8. Update `AI_PROJECT_HANDOFF.md` in the same turn (new tokens, new components, motion system, header band slot).
