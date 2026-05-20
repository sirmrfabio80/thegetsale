// Setup types and option lists. Persistence lives in `src/data/setupStore.ts`
// and the backend `user_setup` table; this file is types-only.

export type StylePreference =
  | "Quiet luxury"
  | "Statement"
  | "Editorial"
  | "Heritage"
  | "Street"
  | "Contemporary";

export type Department = "Womenswear" | "Menswear" | "Unisex" | "Kidswear";

export const DEPARTMENT_OPTIONS: { value: Department; description: string }[] = [
  { value: "Womenswear", description: "Collections cut for women." },
  { value: "Menswear", description: "Collections cut for men." },
  { value: "Unisex", description: "Genderless and shared silhouettes." },
  { value: "Kidswear", description: "Children's collections and capsules." },
];

export type SetupState = {
  departments?: Department[];
  houses: string[];
  categories: string[];
  styles?: StylePreference[];
  notifications: {
    emailSignals: boolean;
    smsDrops: boolean;
    weeklyDigest: boolean;
  };
  completedAt?: string;
};
