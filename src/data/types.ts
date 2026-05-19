export type SignalKind = "soon" | "hold" | "buy" | "low";

export type Category =
  | "Womens"
  | "Mens"
  | "Accessories"
  | "Footwear"
  | "Jewellery";

export interface SaleEvent {
  date: string; // ISO
  label: string; // e.g. "Mid-Season Edit"
  depth: string; // e.g. "Up to 30%"
}

export interface SignalFactor {
  title: string;
  note: string;
}

export interface Brand {
  id: string;
  name: string;
  category: Category;
  tagline: string;
  signal: SignalKind;
  headline: string; // short recommendation
  confidence: number; // 0-100
  windowDays: number; // predicted days to next sale
  lastSaleDays: number; // days since last sale
  expectedDepth: string; // "20–30%"
  cadence: string; // "Sales roughly every 9 weeks"
  factors: SignalFactor[];
  history: SaleEvent[];
}

export interface WatchlistItem {
  brandId: string;
  addedAt: string;
}
