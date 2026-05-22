
# Review of Claude's avatar/name + perf plan

Most of it is sound. Below is what to **keep**, **fix**, and **drop** before implementing.

## Keep as-is

1. **`deriveDisplayName` cleanup** in `src/lib/auth.ts` — removing the `?? user.email` fallback is correct. The field name lies today.
2. **`localPartFromEmail` helper** + new cascade in `PageLayout.tsx` (display_name → metadata name → titled local-part → `?`). Good UX, never leaks the raw email in the chip while keeping the full email under "Signed in as" in the dropdown. Whitespace normalization is the right touch.
3. **Auth subscription fan-out** finding (perf #2). Real issue — every `useAuth()` consumer opens its own `onAuthStateChange` + `getSession()`. Worth consolidating into a module-scoped store seeded from the router.
4. **Double `apply()` on boot** (perf #3). `getSession()` and the `INITIAL_SESSION` event both invalidate. Easy win: skip the manual `getSession()` and rely on `INITIAL_SESSION`.
5. **Render-blocking Google Fonts** (perf #7) and **bundle/Radix audit** (perf #6, #9). Legit.

## Fix before shipping

1. **Loader "waterfall" claim is wrong** (perf #5). In `dashboard.tsx`, the three `ensureQueryData` calls are **fire-and-forget** — they start concurrently, not serially. They're already parallel; the loader just doesn't *wait* for them, which means the component suspends on `useSuspenseQuery` for whichever isn't ready yet. The real nit is "loader returns before data lands so first paint suspends", not "serial waterfall". Reword or drop.
2. **Path prefix `thegetsale/`** in every link is wrong — project root is the repo root, paths are `src/...`, not `thegetsale/src/...`. Strip the prefix everywhere in the doc.
3. **SSR auth gap** (perf #4) — the recommendation ("forward session cookie at SSR") is a much bigger architectural change than the doc implies; it requires switching Supabase auth to cookie-based storage. Mark as "long-term" rather than a quick win, or drop from the prioritized list.

## Drop

1. **Deleting `src/components/ui/avatar.tsx`** — out of scope and risky. It's a shadcn primitive; unused today doesn't mean unused tomorrow, and our convention is to keep the shadcn surface intact. Skip the delete.
2. **Supabase Proxy on hot paths** (perf #8) — Claude already flags it as low. Just remove the section; it's noise without profiling data.
3. **Cloudflare Workers cold-start** (perf #9) as a standalone section — collapse into the bundle section (#6); it's the same root cause.

## Net plan to implement (build mode)

1. `src/lib/auth.ts`: drop email fallback in `deriveDisplayName`; add and export `localPartFromEmail`.
2. `src/components/PageLayout.tsx`: import helper, rebuild label cascade with whitespace normalization, leave the dropdown's "Signed in as" email untouched.
3. `docs/PERFORMANCE.md` (new): keep sections 1, 2, 3, 6, 7, 10. Reword 5. Soften 4. Drop 8, fold 9 into 6. Strip `thegetsale/` from all paths.

## Verification (unchanged from Claude's plan, minus build step)

- Header chip shows `Sirfabio` for `sirfabio@icloud.com` when `display_name` is null; `S` as avatar letter.
- Setting `display_name = "Fab E."` updates chip to `Fab E.`, letter `F`.
- `display_name = "   "` falls back to local-part, not blank.
- Dropdown still shows full email under "Signed in as".
