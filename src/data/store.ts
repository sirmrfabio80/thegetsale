import { useSyncExternalStore } from "react";
import type { WatchlistItem } from "./types";

let watchlist: WatchlistItem[] = [
  { brandId: "maison-ardoise", itemName: "Ardoise Wool Coat", addedAt: "2026-05-02" },
  { brandId: "halden", itemName: "Halden Derby, Oak", addedAt: "2026-05-10" },
  { brandId: "branwell", itemName: "Branwell Cashmere Crew", addedAt: "2026-05-14" },
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
  add(item: WatchlistItem) {
    if (watchlist.some((w) => w.brandId === item.brandId && w.itemName === item.itemName)) return;
    watchlist = [item, ...watchlist];
    emit();
  },
  remove(brandId: string, itemName: string) {
    watchlist = watchlist.filter((w) => !(w.brandId === brandId && w.itemName === itemName));
    emit();
  },
};

export function useWatchlist() {
  return useSyncExternalStore(
    watchlistStore.subscribe,
    watchlistStore.get,
    watchlistStore.get,
  );
}
