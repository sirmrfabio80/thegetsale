
# Fix Setup page mutation feedback loop

The `/setup` page locks the main thread on every chip click because `useSetupMutation().save` is recreated each render (its `useCallback` depends on the whole `mutation` object), which retriggers the auto-save `useEffect`, which mutates cache, which re-renders, which rebuilds `save` again — a classic feedback loop. Each chip also receives a new inline arrow on every render so every chip in the picker rerenders too.

Fix in four files, no UI/copy/logic changes, no new dependencies.

## 1. `src/data/setupStore.ts` — stable `save`

In `useSetupMutation`:
- Destructure `const { mutate } = useMutation({...})` (TanStack's `mutate` is referentially stable).
- Return `save: mutate` directly (or `useCallback((p) => mutate(p), [mutate])`). Drop the existing `useCallback` that depended on the full `mutation` object.
- Keep `isPending` exposed as today via the mutation's own `isPending` field (read from a separate variable or return the mutation object too — but never put the mutation object in a dep array elsewhere).

## 2. `src/routes/_authenticated/setup.tsx` — debounce + skip redundant saves

In `SetupPage`:

- Add refs:
  - `const saveRef = useRef(save);` plus a `useEffect(() => { saveRef.current = save; });` to always hold the latest stable `save`.
  - `const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);`
  - `const lastPersistedRef = useRef<PersistedPayload | null>(null);` where `PersistedPayload` is the shape passed to `save` (no `markCompleted`).

- Helper `shallowEqualSetup(a, b)`:
  - Compare `departments`, `houses`, `categories`, `styles` as arrays-by-value: sort copies and join, compare strings.
  - Compare `notifications` key-by-key (`emailSignals`, `smsDrops`, `weeklyDigest`).
  - Return `true` if all equal.

- Hydration effect: when setting `setHydrated(true)`, also set `lastPersistedRef.current` to the snapshot just hydrated (or to an empty default if `setup` was null). This guarantees the first auto-save comparison shows "no change".

- Replace the auto-save effect:
  ```ts
  useEffect(() => {
    if (!hydrated) return;
    const payload = {
      departments: [...departments],
      houses: [...houses],
      categories: [...categories],
      styles: [...styles],
      notifications: { emailSignals, smsDrops, weeklyDigest },
    };
    if (lastPersistedRef.current && shallowEqualSetup(lastPersistedRef.current, payload)) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lastPersistedRef.current = payload;
      saveRef.current(payload);
      debounceRef.current = null;
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [hydrated, departments, houses, categories, styles, emailSignals, smsDrops, weeklyDigest]);
  ```
  Note: `save` is intentionally not in the deps; we use `saveRef.current`.

- `handleStart`: clear any pending debounce timer, then call `save({...payload, markCompleted: true})` immediately (synchronous as today), update `lastPersistedRef.current`, then navigate. No debounce on completion.

## 3. Memoize filters in `SetupPage`

Replace inline `.filter(...)` chains and the IIFE empty-state checks:

- `const filteredHouseGroups = useMemo(() => { const q = houseQuery.toLowerCase(); return options.houseGroups.map(g => ({ ...g, houses: g.houses.filter(h => (!q || h.name.toLowerCase().includes(q)) && (!housesSelectedOnly || houses.has(h.name))) })).filter(g => g.houses.length > 0); }, [options.houseGroups, houseQuery, housesSelectedOnly, houses]);`
- Equivalent `filteredCategories` and `filteredStyles` memos (styles searches both `label` and `description`).
- Render the "No X match your filters." paragraph from `filteredX.length === 0` (for houses use `filteredHouseGroups.length === 0`). Remove the IIFEs.

## 4. `src/components/setup/SelectableChip.tsx` + parent handlers

- Change the chip API:
  ```tsx
  interface SelectableChipProps {
    label: string;
    value: string;
    selected: boolean;
    onToggle: (value: string) => void;
  }
  ```
  Internally call `onToggle(value)`. Wrap the export in `React.memo` (default shallow comparison).

- In `setup.tsx`, define stable handlers once with `useCallback`:
  ```ts
  const toggleHouse = useCallback((name: string) => setHouses(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; }), []);
  const toggleCategory = useCallback((label: string) => setCategories(prev => { ... }), []);
  const toggleStyle = useCallback((label: string) => setStyles(prev => { const n = new Set(prev); n.has(label as StylePreference) ? n.delete(label as StylePreference) : n.add(label as StylePreference); return n; }), []);
  ```
  Pass `onToggle={toggleHouse}` (etc.) and `value={house.name}` to each chip. With memoization, only chips whose `selected` flips will rerender.

- Department buttons remain inline (they're not `SelectableChip` and there are only 4).

## Out of scope

- No visual/UI changes, no copy edits, no business-logic changes.
- No DB / server-function / route changes.
- No new dependencies.
- No changes to `SaveDTO` shape or types.

## Acceptance checks (manual)

1. Fresh `/setup` load with existing setup → no POST to `saveMySetup` fires.
2. Single chip click → exactly one POST after ~500ms; chip toggles instantly.
3. Six rapid chip clicks (<500ms) → one POST with the final combined state.
4. Typing in the houses search → non-matching/unchanged chips don't rerender (verify with React DevTools highlight-updates).
5. Safari Timeline on fresh load shows <50 timer installs in the first second.
6. `handleStart` still completes immediately and navigates to `/dashboard`.
