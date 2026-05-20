import { useSyncExternalStore } from "react";
import type { WatchlistItem } from "./types";

let watchlist: WatchlistItem[] = [
  { brandId: "maison-ardoise", addedAt: "2026-05-02" },
  { brandId: "halden", addedAt: "2026-05-10" },
  { brandId: "branwell", addedAt: "2026-05-14" },
];

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const watchlistStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get() {
    return watchlist;
  },
  has(brandId: string) {
    return watchlist.some((w) => w.brandId === brandId);
  },
  add(brandId: string) {
    if (watchlist.some((w) => w.brandId === brandId)) return;
    watchlist = [
      { brandId, addedAt: new Date().toISOString().slice(0, 10) },
      ...watchlist,
    ];
    emit();
  },
  remove(brandId: string) {
    watchlist = watchlist.filter((w) => w.brandId !== brandId);
    emit();
  },
  removeMany(brandIds: string[]) {
    if (brandIds.length === 0) return;
    const set = new Set(brandIds);
    watchlist = watchlist.filter((w) => !set.has(w.brandId));
    emit();
  },
  toggle(brandId: string) {
    if (watchlistStore.has(brandId)) {
      watchlistStore.remove(brandId);
      return false;
    }
    watchlistStore.add(brandId);
    return true;
  },
};

export function useWatchlist() {
  return useSyncExternalStore(
    watchlistStore.subscribe,
    watchlistStore.get,
    watchlistStore.get,
  );
}
