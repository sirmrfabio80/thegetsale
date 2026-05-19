import { useEffect, useState } from "react";
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
  return (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? user.email ?? null;
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

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
    email: null,
    displayName: null,
  });

  useEffect(() => {
    let active = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setState(fromUser(session?.user ?? null));
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setState(fromUser(session?.user ?? null));
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}

export type OAuthResult = { error?: Error; redirected?: boolean; authenticated?: boolean };

export async function signInWithGoogle(): Promise<OAuthResult> {
  return signInWithProvider("google");
}

export async function signInWithApple(): Promise<OAuthResult> {
  return signInWithProvider("apple");
}

async function signInWithProvider(provider: "google" | "apple"): Promise<OAuthResult> {
  try {
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}/auth/callback`,
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

export async function signUpWithEmail(email: string, password: string): Promise<EmailAuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
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

