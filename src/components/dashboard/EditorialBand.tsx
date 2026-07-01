import defaultBand from "@/assets/editorial-band-default.svg";
import { VideoBanner } from "@/components/VideoBanner";

interface EditorialBandProps {
  eyebrow: string;
  headline: string;
  imageUrl?: string;
  alt?: string;
  videoWebm?: string;
  videoMp4?: string;
  poster?: string;
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
  const posterSrc = poster ?? imageUrl ?? defaultBand;

  return (
    <VideoBanner
      ariaLabel={alt ?? headline}
      webm={videoWebm}
      mp4={videoMp4}
      poster={posterSrc}
      grain
      className="border-y border-border"
      style={{ height: "clamp(220px, 36vw, 420px)", boxShadow: "var(--shadow-3)" }}
    >
      <div className="absolute inset-x-0 bottom-0 p-4 md:p-6">
        <div className="inline-block max-w-full border border-border bg-background/75 px-4 py-3 backdrop-blur-sm md:px-5 md:py-4">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-1 font-serif text-3xl leading-[1.05] md:text-5xl">{headline}</h1>
        </div>
      </div>
    </VideoBanner>
  );
}
