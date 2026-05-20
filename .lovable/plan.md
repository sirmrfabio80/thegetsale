## Goal

Non-admins who hit `/admin/sales` (or any `/_authenticated/_admin/*` route) should see a calm "access denied" moment, then be redirected to `/dashboard`. Today `src/routes/_authenticated/_admin.tsx` only renders an inline "Not for you" panel and never navigates away.

## Approach

Single-file change to `src/routes/_authenticated/_admin.tsx`.

1. **Server-side guard via `beforeLoad`** — call `getMyAdminStatus` from the route's `beforeLoad`. If not admin, `throw redirect({ to: "/dashboard" })`. This handles the SSR / direct-link case cleanly with no flash of admin content and no client round-trip. Wrap in try/catch that re-throws `isRedirect(e)` so the redirect is not swallowed; on a genuine fetch error, also redirect to `/dashboard` (fail closed).

2. **Client-side calm denial state** — keep `useIsAdmin()` in the component for the rare case the user's role is revoked mid-session. If `data.isAdmin === false`, render the existing calm panel (eyebrow "Admin" · serif "Not for you." · muted subtext) and schedule a `navigate({ to: "/dashboard", replace: true })` after ~1.6s via `useEffect` + `setTimeout` (cleared on unmount). The panel gets a small "Redirecting to your dashboard…" line and a manual "Back to signals" link as a fallback.

3. **Loading state** — unchanged: quiet "Checking access…" line.

## Out of scope

- No changes to `admin.functions.ts`, navigation, or the sales page itself.
- No new dependencies.

## Verification

- Admin account: `/admin/sales` loads normally.
- Non-admin account direct-link to `/admin/sales`: `beforeLoad` redirects to `/dashboard` before render.
- Non-admin in a live session whose role flips: calm panel appears briefly, then auto-redirects to `/dashboard`.
