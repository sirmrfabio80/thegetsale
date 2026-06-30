
# DB-driven global theming for The Get

One registry of named visual variables, persisted in the database, edited from a new admin **Design** tab, applied globally (including logged-out pages) with no flash. Ship a second seeded **Playful** theme to prove the switch.

## 1. Database — `themes` table

Migration creates:

- `public.themes`: `id uuid pk default gen_random_uuid()`, `key text unique not null` (slug), `name text not null`, `tokens jsonb not null default '{}'::jsonb`, `is_active boolean not null default false`, `created_at`, `updated_at`.
- Partial unique index `create unique index themes_only_one_active on public.themes (is_active) where is_active = true` — guarantees a single active row.
- GRANTs: `SELECT` to `anon, authenticated` (public pages must read the active theme during SSR via anon as well as the admin client); `ALL` to `service_role`.
- RLS enabled. Policies mirror `app_settings`:
  - `select` to `anon, authenticated`: `using (true)`.
  - `all` to `authenticated` gated by `public.has_role(auth.uid(), 'admin')`.
- `update_updated_at_column` trigger on update.
- Seed two rows in the same migration (see §6).

## 2. Token registry — single source of truth

`src/lib/theme/registry.ts` exports an ordered array. Each entry:

```ts
{ key, cssVar, label, description, group, type, default, options? }
```

- `group`: `"Color" | "Typography" | "Shape & Borders" | "Shadows" | "Labels & Motion"`.
- `type`: `"color" | "font" | "length" | "select" | "shadow"`.
- Includes every existing token in `:root` (background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, signal-*, signal-*-wash, --radius, --font-serif, --font-sans, --shadow-1/2/3) **plus** new structural tokens:
  - `--radius-card`, `--radius-button`, `--radius-badge`
  - `--border-width`
  - `--label-transform` (select: `uppercase | none`)
  - `--label-tracking` (length)

Defaults exactly match today's `:root` values so Editorial is byte-for-byte unchanged.

Helper: `tokensToCss(tokens) -> ":root{ --x: y; … }"` — falls back to registry defaults for missing keys; ignores unknown keys.

## 3. Structural tokenisation

Goal: stop encoding "serious editorial" only in scattered utility classes so a Playful theme can actually look different.

- `src/styles.css`:
  - Add new tokens to `:root` with current-look defaults: `--radius-card: 0; --radius-button: 0; --radius-badge: 0; --border-width: 1px; --label-transform: uppercase; --label-tracking: 0.18em;`
  - Expose what's needed via `@theme inline`.
  - Update `.eyebrow` to `text-transform: var(--label-transform); letter-spacing: var(--label-tracking);`
  - Add small reusable utility classes (`@utility`): `.ui-card-radius { border-radius: var(--radius-card); }`, `.btn-shape { border-radius: var(--radius-button); }`, `.badge-shape { border-radius: var(--radius-badge); }`, `.tab-trigger { border-radius: var(--radius-button); text-transform: var(--label-transform); letter-spacing: var(--label-tracking); }`.
- Replace hard-coded clusters (visual-only, no behaviour change) in at minimum:
  - `src/components/CardBase.tsx` (cards inherit `--radius-card`).
  - `src/components/SignalBadge.tsx` (`uppercase tracking-[0.18em]` → token-driven; pill via `badge-shape`).
  - `src/components/ui/button.tsx` (`rounded-*` → `btn-shape`).
  - `src/routes/_authenticated/_admin/admin.sales.tsx` Tabs (`rounded-none …` → `tab-trigger`).
- Other `rounded-none` / `uppercase tracking-[0.18em]` occurrences are not blocking; sweep where touched.

## 4. Server functions — `src/lib/theme.functions.ts`

Pattern matches `src/lib/app-settings.functions.ts` (Zod input validators, `requireSupabaseAuth` + `has_role` for admin writes, `supabaseAdmin` for writes loaded inside handlers per Cloud rules).

- `getActiveTheme` — `GET`, **no auth**. Reads via server publishable client (anon) so SSR for logged-out pages works. Returns `{ key, name, tokens }`; if no row, returns registry defaults under `key: "editorial"`.
- `listThemes` — admin.
- `getTheme({ key })` — admin.
- `createTheme({ name })` — admin. Slugifies name → `key`; duplicates the currently-active theme's tokens; `is_active = false`.
- `upsertThemeTokens({ key, tokens })` — admin. Validates each token key against the registry; merges into existing `tokens` jsonb.
- `setActiveTheme({ key })` — admin. Single transaction (RPC or two-step `update … set is_active = false where is_active`; `update … set is_active = true where key = $1`) so the partial-unique constraint never trips mid-flight.

## 5. SSR injection — no FOUC

`src/routes/__root.tsx`:

- Add a root `loader` that calls `getActiveTheme()` and returns `{ themeCss }` (string from `tokensToCss`).
- In `RootShell`, render after `<HeadContent />` and after the stylesheet `<link>`:
  ```tsx
  <style id="theme-tokens" dangerouslySetInnerHTML={{ __html: themeCss }} />
  ```
- Source order matters: defaults in `styles.css` first, DB overrides last. Public/marketing pages get themed server-side. Existing meta/links and the async Google Fonts script untouched.
- React Query key `["theme", "active"]` invalidated after `setActiveTheme` / `upsertThemeTokens`; `router.invalidate()` re-runs the loader so the injected `<style>` updates without a full reload.

## 6. Seeded themes (in migration)

- **`editorial`** — `is_active = true`. `tokens` = exact current `:root` values (warm off-white OKLCH, sharp corners, uppercase 0.18em labels, quiet shadows).
- **`playful`** — `is_active = false`. Visibly different:
  - `--radius-card: 1rem; --radius-button: 9999px; --radius-badge: 9999px;`
  - `--label-transform: none; --label-tracking: 0;`
  - Higher-chroma vibrant OKLCH primary/accent and brighter signal colours, contrast-safe against the surface.
  - Softer/larger shadows (e.g. `--shadow-2: 0 8px 24px -8px oklch(0 0 0 / 0.14)`).
  - Keep Inter/Instrument Serif to avoid loading a new font in this slice.

## 7. Admin Design tab

`src/components/admin/ThemeTab.tsx`, wired into the existing `<Tabs>` in `src/routes/_authenticated/_admin/admin.sales.tsx` as a new `TabsTrigger value="design"` labelled "Design" using the same `tab-trigger` styling.

Contents:

- Theme `<Select>` listing all themes + a small "Active" tag next to the active one.
- Buttons: **Set as active** (calls `setActiveTheme`), **Duplicate** (calls `createTheme`, prompts for name).
- Registry-driven form: variables grouped by `group`, each row shows `label`, `description` as helper text, and an input chosen from `type`:
  - `color`: text input prefilled with the OKLCH string + a live swatch (`<div style={{ background: value }}>`). Note explaining OKLCH is fine and not lossy.
  - `font` / `length`: text input.
  - `select`: `<Select>` of `options`.
  - `shadow`: text input.
- Save calls `upsertThemeTokens`; inline pending → "Saved" indicator beside each group's save button. **No toasts** (per `src/lib/toast.ts` shim). Inputs disabled while mutating. Invalidate `["themes"]` and `["theme","active"]` on success.
- Admin-only enforced by existing `_admin` route guard; server fns re-check `has_role`.

## Technical notes

- `themes.tokens` shape: flat `Record<string,string>` keyed by `cssVar` (e.g. `"--primary": "oklch(0.19 0.015 65)"`). Validation rejects keys not in the registry on write.
- `getActiveTheme` is called from the root loader on every request — cheap single-row read; safe for anon. No service-role needed on read.
- Partial-unique index + transactional `setActiveTheme` keeps the "one active" invariant without app-layer races.
- `tokensToCss` escapes values minimally (strip `;` `}` `<`) to prevent CSS-injection; only registry-allowed keys are emitted regardless.
- No `tailwind.config.js`. Stays on Tailwind v4 + `@theme inline` in `styles.css`. OKLCH preserved.
- Toasts remain disabled. Sonner is not reintroduced.
- AI_PROJECT_HANDOFF.md gets a short "Theming" section noting the registry, server fns, SSR injection, and seeded themes.

## Files

New:
- `supabase/migrations/<ts>_themes.sql`
- `src/lib/theme/registry.ts`
- `src/lib/theme/css.ts` (`tokensToCss`)
- `src/lib/theme.functions.ts`
- `src/components/admin/ThemeTab.tsx`

Edited:
- `src/styles.css` (new tokens, `.eyebrow`, shared `@utility` classes)
- `src/routes/__root.tsx` (loader + `<style id="theme-tokens">`)
- `src/components/CardBase.tsx`, `src/components/SignalBadge.tsx`, `src/components/ui/button.tsx`, `src/routes/_authenticated/_admin/admin.sales.tsx` (replace hard-coded rounded/uppercase clusters)
- `AI_PROJECT_HANDOFF.md`

## Verification

1. Editorial unchanged — visually identical to today on `/`, dashboard, brand detail, admin.
2. View source on a logged-out hard reload shows the populated `<style id="theme-tokens">`; no flash.
3. Admin → Design: change `--primary` and `--radius-card`, save, set active → reload → changes reflected everywhere including marketing.
4. Switch to **Playful** → rounded, vibrant, sentence-case labels, pill buttons. Switch back → reverts.
5. RLS: anon and non-admin authenticated users cannot write `themes`; `getActiveTheme` succeeds for everyone. Supabase linter clean.
6. `bun run lint` and `bun run build` pass.
