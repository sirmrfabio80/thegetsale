import { useSyncExternalStore } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type AuthState = {
  status: AuthStatus;
  user: User | null;
  email: string | null;
  displayName: string | null;
};

function deriveDisplayName(user: User | null): string | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  return (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? null;
}

export function localPartFromEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return null;
  const local = trimmed.slice(0, at).replace(/[._-]+/g, " ").trim();
  if (!local) return null;
  return local
    .split(/\s+/)
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
    .join(" ");
}

function fromUser(user: User | null): AuthState {
  if (!user) return { status: "unauthenticated", user: null, email: null, displayName: null };
  return {
    status: "authenticated",
    user,
    email: user.email ?? null,
    displayName: deriveDisplayName(user),
  };
}

// Module-scoped auth store. A single Supabase subscription is opened lazily
// the first time any component subscribes via useAuth(), and shared across
// every consumer. Previously each useAuth() caller opened its own
// onAuthStateChange + getSession() round-trip on mount.
const LOADING_STATE: AuthState = {
  status: "loading",
  user: null,
  email: null,
  displayName: null,
};

let currentState: AuthState = LOADING_STATE;
const listeners = new Set<() => void>();
let supabaseUnsubscribe: (() => void) | null = null;

function emit(next: AuthState) {
  if (
    next.status === currentState.status &&
    next.user?.id === currentState.user?.id &&
    next.email === currentState.email &&
    next.displayName === currentState.displayName
  ) {
    return;
  }
  currentState = next;
  for (const listener of listeners) listener();
}

function ensureSubscribed() {
  if (supabaseUnsubscribe || typeof window === "undefined") return;
  // onAuthStateChange fires INITIAL_SESSION on subscribe, so no manual
  // getSession() call is needed — that would double-invalidate on boot.
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    emit(fromUser(session?.user ?? null));
  });
  supabaseUnsubscribe = () => subscription.unsubscribe();
}

function subscribe(listener: () => void): () => void {
  ensureSubscribed();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    // Intentionally keep the Supabase subscription alive for the lifetime of
    // the tab. Tearing it down on listeners=0 caused currentState to reset to
    // LOADING during route transitions (when old subscribers unmount before
    // new ones mount), making the entire auth-gated UI flash off.
  };
}

function getSnapshot(): AuthState {
  return currentState;
}

function getServerSnapshot(): AuthState {
  return LOADING_STATE;
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export type OAuthResult = { error?: Error; redirected?: boolean; authenticated?: boolean };

export async function signInWithGoogle(redirectTo?: string): Promise<OAuthResult> {
  return signInWithProvider("google", redirectTo);
}

export async function signInWithApple(redirectTo?: string): Promise<OAuthResult> {
  return signInWithProvider("apple", redirectTo);
}

function buildCallbackUrl(redirectTo?: string): string {
  const base = `${window.location.origin}/auth/callback`;
  if (!redirectTo) return base;
  return `${base}?redirect=${encodeURIComponent(redirectTo)}`;
}

async function signInWithProvider(
  provider: "google" | "apple",
  redirectTo?: string,
): Promise<OAuthResult> {
  try {
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: buildCallbackUrl(redirectTo),
    });
    if (result.error) {
      return { error: result.error instanceof Error ? result.error : new Error(String(result.error)) };
    }
    if (result.redirected) return { redirected: true };
    // Tokens received and session already set — caller should navigate.
    return { authenticated: true };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}


export type EmailAuthResult = { error?: Error; needsVerification?: boolean; authenticated?: boolean };

export async function signUpWithEmail(
  email: string,
  password: string,
  redirectTo?: string,
): Promise<EmailAuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: buildCallbackUrl(redirectTo) },
    });
    if (error) return { error };
    if (data.session) return { authenticated: true };
    return { needsVerification: true };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function signInWithEmail(email: string, password: string): Promise<EmailAuthResult> {
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };
    return { authenticated: true };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function requestPasswordReset(email: string): Promise<{ error?: Error }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { error };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function updatePassword(password: string): Promise<{ error?: Error }> {
  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}


