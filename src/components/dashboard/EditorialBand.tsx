import defaultBand from "@/assets/editorial-band-default.svg";
import { FullBleedSection } from "@/components/FullBleedSection";
import { MediaBackdrop } from "@/components/MediaBackdrop";

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
    <FullBleedSection
      ariaLabel={alt ?? headline}
      className="border-y border-border"
      style={{ height: "clamp(220px, 36vw, 420px)", boxShadow: "var(--shadow-3)" }}
    >
      <MediaBackdrop poster={posterSrc} webm={videoWebm} mp4={videoMp4} />
      <div aria-hidden className="paper-grain-heavy absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 p-4 md:p-6">
        <div className="inline-block max-w-full border border-border bg-background/75 px-4 py-3 backdrop-blur-sm md:px-5 md:py-4">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-1 font-serif text-3xl leading-[1.05] md:text-5xl">{headline}</h1>
        </div>
      </div>
    </FullBleedSection>
  );
}
