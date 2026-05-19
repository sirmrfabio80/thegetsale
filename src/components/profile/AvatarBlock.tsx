type Size = "sm" | "lg";

export function AvatarBlock({
  url,
  fallback,
  size = "lg",
  loading = false,
}: {
  url: string | null;
  fallback: string;
  size?: Size;
  loading?: boolean;
}) {
  const dim = size === "lg" ? "h-24 w-24 text-2xl" : "h-7 w-7 text-[11px]";
  const letter = (fallback ?? "?").trim().charAt(0).toUpperCase() || "?";

  if (loading) {
    return (
      <span
        className={`relative inline-flex ${dim} overflow-hidden border border-border bg-muted`}
        aria-busy="true"
        aria-label="Loading photo"
      >
        <span
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, color-mix(in oklab, currentColor 8%, transparent) 50%, transparent 100%)",
            animation: "theget-shimmer 1.6s linear infinite",
          }}
        />
      </span>
    );
  }

  return (
    <span
      className={`relative inline-flex ${dim} items-center justify-center overflow-hidden border border-foreground bg-background font-serif text-foreground`}
      aria-hidden={size === "sm"}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span>{letter}</span>
      )}
    </span>
  );
}
