import type { Brand, Category } from "./types";
import type { Department } from "./setupStorage";

export function brandDepartment(b: Brand): Department {
  if (b.category === "Womens") return "Womenswear";
  if (b.category === "Mens") return "Menswear";
  return "Unisex";
}

// Maps setup category labels to dashboard Brand categories.
const SETUP_TO_BRAND: Record<string, Category[]> = {
  Bags: ["Accessories"],
  Shoes: ["Footwear"],
  Jewellery: ["Jewellery"],
  Accessories: ["Accessories"],
  "Ready-to-wear": ["Womens", "Mens"],
  Outerwear: ["Womens", "Mens"],
};

export function mapSetupCategories(selected: string[]): Set<Category> {
  const out = new Set<Category>();
  for (const s of selected) {
    for (const c of SETUP_TO_BRAND[s] ?? []) out.add(c);
  }
  return out;
}

export function matchesSelection(
  brand: Brand,
  selectedHouses: Set<string>,
  mappedCategories: Set<Category>,
): boolean {
  if (selectedHouses.has(brand.name)) return true;
  if (mappedCategories.has(brand.category)) return true;
  return false;
}
