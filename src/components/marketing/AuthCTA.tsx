import { Link } from "@tanstack/react-router";
import { usePrivateBeta } from "@/hooks/use-private-beta";
import { cn } from "@/lib/utils";

type AuthCTAVariant = "primary" | "secondary" | "text";
type AuthCTASize = "default" | "small" | "nav";
type AuthCTAMode = "signin" | "signup" | "auto";

type AuthCTAProps = {
  variant?: AuthCTAVariant;
  size?: AuthCTASize;
  mode?: AuthCTAMode;
  children?: React.ReactNode;
  className?: string;
  search?: Record<string, string | number | boolean | undefined>;
};

const baseClasses =
  "inline-flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const variantClasses: Record<AuthCTAVariant, string> = {
  primary:
    "border border-foreground bg-foreground text-background hover:opacity-90",
  secondary:
    "border border-border text-foreground transition-colors hover:border-foreground",
  text: "text-muted-foreground transition-colors hover:text-foreground",
};

const sizeClasses: Record<AuthCTASize, string> = {
  default: "h-12 px-6 text-[12px] uppercase tracking-[0.18em]",
  small: "h-11 px-6 text-[11px] uppercase tracking-[0.18em]",
  nav: "h-11 px-3 text-[12px] uppercase tracking-[0.18em]",
};

const defaultLabels: Record<AuthCTAMode, string> = {
  signin: "Sign in",
  signup: "Sign up",
  auto: "Create your signal",
};

export function AuthCTA({
  variant = "primary",
  size = "default",
  mode = "auto",
  children,
  className,
  search,
}: AuthCTAProps) {
  const { enabled: privateBeta } = usePrivateBeta();
  const isSignup = mode === "auto" ? !privateBeta : mode === "signup";
  const to = isSignup ? "/signup" : "/login";

  return (
    <Link
      to={to}
      search={search}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        variant === "text" && "h-auto px-0 normal-case tracking-normal",
        className
      )}
    >
      {children ?? defaultLabels[mode]}
    </Link>
  );
}
