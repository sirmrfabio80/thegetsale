import { useEffect, useState } from "react";
import type { UserIdentity } from "@supabase/supabase-js";
import { toast } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Provider = "google" | "apple";

const PROVIDER_LABEL: Record<Provider, string> = {
  google: "Google",
  apple: "Apple",
};

export function ConnectedAccounts({ email }: { email: string | null }) {
  const [identities, setIdentities] = useState<UserIdentity[] | null>(null);
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const { data } = await supabase.auth.getUserIdentities();
    setIdentities(data?.identities ?? []);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const linked = (provider: Provider) =>
    identities?.some((i) => i.provider === provider) ?? false;

  const link = async (provider: Provider) => {
    setError(null);
    setPending(provider);
    try {
      const { error: linkError } = await supabase.auth.linkIdentity({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (linkError) throw linkError;
      // Browser redirects to provider; nothing else to do.
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Couldn't start linking.";
      const friendly = /manual linking|not enabled/i.test(raw)
        ? "Account linking isn't enabled on this project yet. Ask an admin to turn on Manual Linking in Auth settings."
        : /email/i.test(raw) && /match|same|different/i.test(raw)
        ? `That ${PROVIDER_LABEL[provider]} account uses a different email than ${email ?? "your account"}. Sign in with the matching email to link.`
        : raw;
      setError(friendly);
      setPending(null);
    }
  };

  const unlink = async (identity: UserIdentity) => {
    setError(null);
    try {
      const { error: unlinkError } = await supabase.auth.unlinkIdentity(identity);
      if (unlinkError) throw unlinkError;
      toast.success(`${identity.provider} disconnected`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't disconnect.");
    }
  };

  const row = (provider: Provider) => {
    const id = identities?.find((i) => i.provider === provider);
    const isLinked = !!id;
    const canUnlink = isLinked && (identities?.length ?? 0) > 1;
    return (
      <div
        key={provider}
        className="flex items-center justify-between border-t border-border py-4 first:border-t-0"
      >
        <div>
          <p className="font-serif text-lg text-foreground">{PROVIDER_LABEL[provider]}</p>
          <p className="text-xs text-muted-foreground">
            {isLinked
              ? `Connected${id?.identity_data?.email ? ` · ${id.identity_data.email}` : ""}`
              : "Not connected"}
          </p>
        </div>
        {isLinked ? (
          <button
            type="button"
            onClick={() => void unlink(id!)}
            disabled={!canUnlink}
            title={canUnlink ? undefined : "Add another sign-in method before disconnecting this one."}
            className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-40"
          >
            Disconnect
          </button>
        ) : (
          <Button
            onClick={() => void link(provider)}
            disabled={pending === provider}
            className="h-10 rounded-none px-4 text-[11px] uppercase tracking-[0.18em]"
          >
            {pending === provider ? "Linking…" : `Link ${PROVIDER_LABEL[provider]}`}
          </Button>
        )}
      </div>
    );
  };

  return (
    <section className="border border-border bg-card p-6 md:p-10">
      <p className="eyebrow">Sign-in methods</p>
      <h2 className="mt-3 font-serif text-2xl text-foreground md:text-3xl">Connected accounts.</h2>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Link Google and Apple to the same account so you can sign in either way. We'll only link a
        provider that shares your verified email ({email ?? "—"}).
      </p>

      <div className="mt-6">
        {identities === null ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (
          <>
            {row("google")}
            {row("apple")}
          </>
        )}
      </div>

      {error && (
        <div
          className="mt-4 border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}
    </section>
  );
}
