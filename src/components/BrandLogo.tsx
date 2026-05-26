import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  name: string;
  logoUrl?: string | null;
  size?: number;
  className?: string;
}

function deriveMonogram(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]+/g, " ")
    .trim();
  if (!cleaned) return "—";
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  const w = words[0];
  return (w.length >= 2 ? w.slice(0, 2) : w[0]).toUpperCase();
}

export function BrandLogo({ name, logoUrl, size = 40, className }: BrandLogoProps) {
  const [errored, setErrored] = useState(false);

  // Reset error state when the source URL changes (e.g. after replace).
  useEffect(() => {
    setErrored(false);
  }, [logoUrl]);

  const showImage = !!logoUrl && !errored;
  const monogram = deriveMonogram(name);

  return (
    <div
      aria-hidden={!showImage}
      style={{ width: size, height: size }}
      className={cn(
        "flex shrink-0 items-center justify-center border border-border bg-muted",
        className,
      )}
    >
      {showImage ? (
        <img
          src={logoUrl!}
          alt={`${name} logo`}
          loading="lazy"
          onError={() => setErrored(true)}
          style={{ padding: 4 }}
          className="h-full w-full object-contain"
        />
      ) : (
        <span
          className="font-serif text-foreground/70"
          style={{ fontSize: Math.round(size * 0.4), lineHeight: 1 }}
        >
          {monogram}
        </span>
      )}
    </div>
  );
}
