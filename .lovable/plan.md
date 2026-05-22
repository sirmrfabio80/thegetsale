## Goal

Make "private beta" a runtime flag controlled by an admin checkbox. When enabled (default), signup + Google/Apple buttons are hidden/disabled. When disabled, full signup flow returns — no code edits needed.

## Approach

Store a single setting in the database. Read it everywhere signup UI appears. Toggle from a new "Settings" tab in Admin.

Note: Supabase server-level `disable_signup` will be set back to `false`. The private beta lock will live at the application layer (UI gating + signup server checks if added later), which is what makes the admin checkbox actually work without re-running config tools.

## Steps

### 1. Database (migration)
- Create `app_settings` table (singleton row, key/value style): one row with `private_beta_enabled boolean default true`.
- RLS: any authenticated user can SELECT; only admins can UPDATE/INSERT.
- Also call `configure_auth` with `disable_signup: false` so the flag actually controls behavior.

### 2. Server functions (`src/lib/app-settings.functions.ts`)
- `getPrivateBetaEnabled()` — public read (uses admin client, returns just the boolean). Safe to call from marketing pages without auth.
- `setPrivateBetaEnabled({ enabled })` — admin-only, updates the row.

### 3. Client hook (`src/hooks/use-private-beta.ts`)
- React Query hook wrapping `getPrivateBetaEnabled`, cached, used across marketing components.

### 4. Gate signup UI on the flag
Each of these reads the flag; when `enabled === true` they show the "Private beta" notice / hide signup CTAs (current behavior). When `false`, they render the original signup form/buttons:
- `src/routes/signup.tsx` — show full `GoogleAuthCard` vs. private-beta notice.
- `src/components/marketing/GoogleAuthCard.tsx` — when private beta is on AND `mode="signup"`, hide Google/Apple/email-signup; on login page always show.
- `src/components/marketing/MarketingNav.tsx` — show/hide "Sign up" button.
- `src/components/marketing/Hero.tsx`, `FinalCTA.tsx`, `PreviewSection.tsx` — toggle CTA between "Sign up" and "Sign in".
- `src/routes/login.tsx` — show "New here? Create your signal" link only when flag is off.

While loading the flag, default to the safer state (private beta ON) to avoid flashing signup buttons.

### 5. Admin UI
- Add a new tab "Settings" in `src/routes/_authenticated/_admin/admin.sales.tsx` (`TabsList` + `TabsContent`).
- New component `src/components/admin/SettingsTab.tsx` with a single checkbox: "Private beta mode (hide signup / social auth)". Uses `setPrivateBetaEnabled` mutation, invalidates the query so marketing pages update immediately.

## Out of scope

- No Supabase Management API integration (no extra secret required).
- No invite/allowlist system.
- No changes to existing auth helpers in `src/lib/auth.ts`.

## Files touched

- New migration (`app_settings` table + RLS)
- New: `src/lib/app-settings.functions.ts`, `src/hooks/use-private-beta.ts`, `src/components/admin/SettingsTab.tsx`
- Edited: `src/routes/signup.tsx`, `src/routes/login.tsx`, `src/components/marketing/GoogleAuthCard.tsx`, `MarketingNav.tsx`, `Hero.tsx`, `FinalCTA.tsx`, `PreviewSection.tsx`, `src/routes/_authenticated/_admin/admin.sales.tsx`
- Auth config: `disable_signup` flipped to `false`
