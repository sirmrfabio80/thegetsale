import { useEffect, useRef, useState } from "react";

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
  // instead of flashing a half-painted <img>. If the image fails to load
  // (404, network error, CORS, broken URL), we drop it entirely so the
  // letter underneath stays visible and the box never renders a broken icon.
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgErrored, setImgErrored] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    setImgLoaded(false);
    setImgErrored(false);
  }, [url]);

  // Cached images can fire `load` before React attaches `onLoad`, leaving
  // the <img> stuck at opacity-0 on route navigation. Check `complete`
  // after mount/url-change and resolve the loaded state ourselves.
  useEffect(() => {
    if (!url) return;
    const node = imgRef.current;
    if (node && node.complete && node.naturalWidth > 0) {
      setImgLoaded(true);
    }
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

  const showImage = !!url && !imgErrored;

  return (
    <span
      className={`${frame} border-foreground font-serif text-foreground`}
      aria-hidden={size === "sm"}
    >
      {/* Letter sits underneath so the box is never empty while the image
          decodes — and stays visible if the image fails to load. */}
      <span className={showImage ? "absolute inset-0 flex items-center justify-center" : ""}>
        {letter}
      </span>
      {showImage && (
        <img
          src={url}
          alt=""
          decoding="async"
          // Nav avatar is above the fold — fetch eagerly with high priority so
          // it lands as early as possible. The large profile avatar is the
          // main subject of its page, so still load it eagerly.
          loading="eager"
          fetchPriority={size === "sm" ? "high" : "auto"}
          onLoad={() => setImgLoaded(true)}
          onError={() => {
            setImgErrored(true);
            setImgLoaded(false);
          }}
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
