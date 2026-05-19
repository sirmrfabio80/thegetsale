export interface BrandGroup {
  label: string;
  brands: string[];
}

export const brandGroups: BrandGroup[] = [
  {
    label: "Quiet luxury",
    brands: ["The Row", "Loro Piana", "Toteme", "Khaite"],
  },
  {
    label: "Heritage houses",
    brands: ["Prada", "Gucci", "Saint Laurent", "Bottega Veneta"],
  },
  {
    label: "Runway signal",
    brands: ["Miu Miu", "Loewe", "Alaïa", "Jacquemus"],
  },
  {
    label: "Contemporary",
    brands: ["Acne Studios", "Ganni", "Isabel Marant", "Reformation"],
  },
];

export const setupCategories = [
  "Bags",
  "Shoes",
  "Ready-to-wear",
  "Outerwear",
  "Jewellery",
  "Accessories",
] as const;
