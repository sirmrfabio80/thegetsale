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
  const local = trimmed
    .slice(0, at)
    .replace(/[._-]+/g, " ")
    .trim();
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

function isCorruptSessionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /JWT|issued at future|AuthSession|deserialize|Invalid Refresh Token/i.test(msg);
}

async function purgeLocalSession() {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // best-effort cleanup
  }
}

function ensureSubscribed() {
  if (supabaseUnsubscribe || typeof window === "undefined") return;
  // onAuthStateChange fires INITIAL_SESSION on subscribe, so no manual
  // getSession() call is needed — that would double-invalidate on boot.
  try {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      try {
        emit(fromUser(session?.user ?? null));
      } catch (err) {
        if (isCorruptSessionError(err)) {
          void purgeLocalSession().then(() => emit(fromUser(null)));
          return;
        }
        throw err;
      }
    });
    supabaseUnsubscribe = () => subscription.unsubscribe();
  } catch (err) {
    // A corrupt persisted token (e.g. "JWT issued at future" from clock skew)
    // can throw synchronously inside supabase-js. Purge and treat as
    // unauthenticated rather than letting the throw reach React's error
    // boundary and render the generic "Something went wrong" page.
    if (isCorruptSessionError(err)) {
      void purgeLocalSession().then(() => emit(fromUser(null)));
      return;
    }
    throw err;
  }
}

function subscribe(listener: () => void): () => void {
  try {
    ensureSubscribed();
  } catch (err) {
    if (isCorruptSessionError(err)) {
      void purgeLocalSession().then(() => emit(fromUser(null)));
    }
    // swallow — do not let auth init crash React render
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    // Keep Supabase subscription alive for the tab lifetime — see note above.
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
      return {
        error: result.error instanceof Error ? result.error : new Error(String(result.error)),
      };
    }
    if (result.redirected) return { redirected: true };
    // Tokens received and session already set — caller should navigate.
    return { authenticated: true };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export type EmailAuthResult = {
  error?: Error;
  needsVerification?: boolean;
  authenticated?: boolean;
};

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
