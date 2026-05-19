type Size = "sm" | "lg";

export function AvatarBlock({
  url,
  fallback,
  size = "lg",
}: {
  url: string | null;
  fallback: string;
  size?: Size;
}) {
  const dim = size === "lg" ? "h-24 w-24 text-2xl" : "h-7 w-7 text-[11px]";
  const letter = (fallback ?? "?").trim().charAt(0).toUpperCase() || "?";
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
