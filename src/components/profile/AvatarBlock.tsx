import { useEffect, useState } from "react";

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

  // Track image load state so swapping from letter → photo fades in smoothly
  // instead of flashing a half-painted <img>.
  const [imgLoaded, setImgLoaded] = useState(false);
  useEffect(() => {
    setImgLoaded(false);
  }, [url]);

  const frame = `relative inline-flex ${dim} shrink-0 align-middle items-center justify-center overflow-hidden border bg-background`;

  if (loading) {
    return (
      <span
        className={`${frame} border-border bg-muted`}
        aria-busy="true"
        aria-label="Loading photo"
      >
        <Shimmer />
      </span>
    );
  }

  return (
    <span
      className={`${frame} border-foreground font-serif text-foreground`}
      aria-hidden={size === "sm"}
    >
      {/* Letter sits underneath so the box is never empty while the image decodes. */}
      <span className={url ? "absolute inset-0 flex items-center justify-center" : ""}>
        {letter}
      </span>
      {url && (
        <img
          src={url}
          alt=""
          decoding="async"
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgLoaded(false)}
          className={`relative h-full w-full object-cover transition-opacity duration-300 ${
            imgLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </span>
  );
}

function Shimmer() {
  return (
    <span
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, color-mix(in oklab, currentColor 8%, transparent) 50%, transparent 100%)",
        animation: "theget-shimmer 1.6s linear infinite",
      }}
    />
  );
}
