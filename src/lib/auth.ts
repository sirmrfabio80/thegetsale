import { useEffect, useState } from "react";

const STORAGE_KEY = "theget.auth.v1";
const EVENT = "theget:auth";

export type AuthState = { isAuthenticated: boolean; email: string | null };

export function getAuth(): AuthState {
  if (typeof window === "undefined") return { isAuthenticated: false, email: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { isAuthenticated: false, email: null };
    const parsed = JSON.parse(raw) as { email?: string };
    if (!parsed?.email) return { isAuthenticated: false, email: null };
    return { isAuthenticated: true, email: parsed.email };
  } catch {
    return { isAuthenticated: false, email: null };
  }
}

export function signIn(email: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ email }));
  window.dispatchEvent(new Event(EVENT));
}

export function signOut() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(() => getAuth());
  useEffect(() => {
    const update = () => setState(getAuth());
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return state;
}
