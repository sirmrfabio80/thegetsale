## Plan

1. Fix the `/watchlist` popup loop at the source in `src/routes/_authenticated/watchlist.tsx`.
   - Remove the effect-driven summary toast logic that is re-triggering on watchlist renders.
   - Keep the existing inline sort/status text (`Sorted by…`, `Updating list…`) so the page still communicates state without popups.
   - Remove the remaining local toast call for clearing department filters.

2. Disable toast rendering globally.
   - Remove the root `<Toaster />` mount from `src/routes/__root.tsx` so no popup container is rendered anywhere in the app.
   - Clean up the now-unused toast/toaster imports.

3. Remove all toast usage across the app.
   - Strip `toast(...)`, `toast.success(...)`, and `toast.error(...)` calls and related imports from the files currently using them:
     - `src/data/store.ts`
     - `src/data/setupStore.ts`
     - `src/routes/brand.$id.tsx`
     - `src/routes/_authenticated/watchlist.tsx`
     - `src/routes/_authenticated/profile.tsx`
     - `src/components/RecommendationCard.tsx`
     - `src/components/profile/ConnectedAccounts.tsx`
     - `src/components/admin/UsersRolesTab.tsx`
     - `src/components/admin/SettingsTab.tsx`
     - `src/components/admin/SaleEventsTab.tsx`
     - `src/components/admin/HousesTab.tsx`
     - `src/components/admin/HouseDrawer.tsx`
     - `src/components/admin/SaleEventDrawer.tsx`
   - Preserve existing behaviour otherwise; no new backend or routing changes.

4. Validate the result.
   - Confirm `/watchlist` no longer shows looping popups.
   - Confirm actions that previously triggered toasts now complete without any popup appearing.
   - Confirm there are no leftover toast imports/usages in `src/`.

## Technical details

- The watchlist loop is caused by toast logic inside an effect that re-runs during state/query updates; removing that popup path fixes the immediate issue.
- Disabling only the root toaster would hide popups, but toast calls would still remain in code. I will remove both the global renderer and the toast calls themselves so toast usage is actually disabled, not just visually suppressed.
- I will keep the change scoped to frontend presentation/state files only.