export const SETUP_STORAGE_KEY = "theget.setup.v1";

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


export function loadSetup(): SetupState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SETUP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SetupState;
    if (
      !parsed ||
      !Array.isArray(parsed.houses) ||
      !Array.isArray(parsed.categories) ||
      typeof parsed.notifications !== "object"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveSetup(state: SetupState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / serialization errors
  }
}

export function clearSetup(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SETUP_STORAGE_KEY);
  } catch {
    // ignore
  }
}
