import { isMarketCode, type MarketCode } from "@/lib/markets";

// Synchronously derive a likely market from the browser locale. Returns null
// when running on the server or when no region tag matches the curated list.
export function detectMarketFromLocale(): MarketCode | null {
  if (typeof navigator === "undefined") return null;
  const candidates: string[] = [];
  if (navigator.languages) candidates.push(...navigator.languages);
  if (navigator.language) candidates.push(navigator.language);
  for (const tag of candidates) {
    const region = tag.split(/[-_]/)[1];
    if (!region) continue;
    const lower = region.toLowerCase();
    if (isMarketCode(lower)) return lower;
  }
  return null;
}

const PENDING_MARKET_KEY = "theget.pendingMarket";

export function stashPendingMarket(market: MarketCode | null) {
  if (typeof window === "undefined") return;
  try {
    if (market) {
      sessionStorage.setItem(PENDING_MARKET_KEY, market);
    } else {
      sessionStorage.removeItem(PENDING_MARKET_KEY);
    }
  } catch {
    /* ignore quota/private-mode errors */
  }
}

export function readPendingMarket(): MarketCode | null {
  if (typeof window === "undefined") return null;
  try {
    const value = sessionStorage.getItem(PENDING_MARKET_KEY);
    return isMarketCode(value) ? value : null;
  } catch {
    return null;
  }
}

export function clearPendingMarket() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PENDING_MARKET_KEY);
  } catch {
    /* ignore */
  }
}
