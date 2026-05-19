## Persist setup selections to localStorage

Save the user's house, category, and notification choices so a refresh or revisit of `/setup` restores their progress. Scoped to the setup flow only — no changes to dashboard, watchlist, or brand detail.

### Storage shape

One key, one JSON blob — easy to evolve, easy to clear.

- Key: `theget.setup.v1`
- Value:
  ```ts
  {
    houses: string[];
    categories: string[];
    notifications: {
      emailSignals: boolean;
      smsDrops: boolean;
      weeklyDigest: boolean;
    };
    completedAt?: string; // ISO, set when "Start watching" is pressed
  }
  ```

Versioned key (`v1`) so we can change the schema later without crashing existing browsers — a parse failure or version mismatch falls back to defaults silently.

### New helper

`src/data/setupStorage.ts`
- `loadSetup(): SetupState | null` — SSR-safe (checks `typeof window`), wraps `JSON.parse` in try/catch, returns `null` on any failure.
- `saveSetup(state: SetupState): void` — SSR-safe, swallows quota/serialization errors.
- `clearSetup(): void` — utility for future "reset" UX (not wired now).
- Exports the `SETUP_STORAGE_KEY` constant and the `SetupState` type.

### Wiring in `src/routes/setup.tsx`

- Initialize each `useState` with a lazy initializer that reads from `loadSetup()`. SSR returns defaults; the client hydrates from storage on mount via a single `useEffect` that calls `setHouses` / `setCategories` / setters with stored values if present. This avoids hydration mismatches (server HTML always renders defaults, client rehydrates after mount).
- A single `useEffect` watching `[houses, categories, emailSignals, smsDrops, weeklyDigest]` calls `saveSetup(...)` so every toggle is persisted immediately.
- `handleStart` writes one final save with `completedAt: new Date().toISOString()` before navigating to `/dashboard`.

### Why this approach

- Single effect for writes keeps logic in one place — no scattered `setX` + `save` pairs to forget.
- Lazy default + post-mount hydration is the safest SSR pattern for TanStack Start; reading localStorage during render would crash SSR.
- One key keeps `localStorage` tidy and makes a future migration to Supabase a single read.

### Out of scope

- No "reset setup" button (helper exists for future use).
- No cross-tab sync via `storage` events.
- No Supabase persistence — local only, as before.
- No migration of any pre-existing key (none exists yet).

### Files

- Add: `src/data/setupStorage.ts`
- Edit: `src/routes/setup.tsx` (hydration effect + persistence effect + completion write)