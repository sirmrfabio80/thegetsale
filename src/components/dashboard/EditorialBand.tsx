import { useEffect, useState } from "react";
import defaultBand from "@/assets/editorial-band-default.svg";

interface EditorialBandProps {
  eyebrow: string;
  headline: string;
  imageUrl?: string;
  alt?: string;
  videoWebm?: string;
  videoMp4?: string;
  poster?: string;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function EditorialBand({
  eyebrow,
  headline,
  imageUrl,
  alt,
  videoWebm,
  videoMp4,
  poster,
}: EditorialBandProps) {
  const reducedMotion = useReducedMotion();
  const hasVideo = Boolean(videoWebm || videoMp4);
  const fallbackSrc = poster ?? imageUrl ?? defaultBand;

  return (
    <section
      aria-label={alt ?? headline}
      className="relative mt-10 overflow-hidden border border-border"
      style={{ height: "clamp(200px, 32vw, 340px)", boxShadow: "var(--shadow-3)" }}
    >
      {hasVideo && !reducedMotion ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={poster}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        >
          {videoWebm && <source src={videoWebm} type="video/webm" />}
          {videoMp4 && <source src={videoMp4} type="video/mp4" />}
        </video>
      ) : (
        <img
          src={fallbackSrc}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full select-none object-cover"
          draggable={false}
        />
      )}
      <div aria-hidden className="paper-grain-heavy absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 p-4 md:p-6">
        <div className="inline-block max-w-full border border-border bg-background/75 px-4 py-3 backdrop-blur-sm md:px-5 md:py-4">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-1 font-serif text-3xl leading-[1.05] md:text-5xl">{headline}</h1>
        </div>
      </div>
    </section>
  );
}
