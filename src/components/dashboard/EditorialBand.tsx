import defaultBand from "@/assets/editorial-band-default.svg";

interface EditorialBandProps {
  eyebrow: string;
  headline: string;
  imageUrl?: string;
  alt?: string;
}

export function EditorialBand({ eyebrow, headline, imageUrl, alt }: EditorialBandProps) {
  const src = imageUrl ?? defaultBand;
  return (
    <section
      aria-label={alt ?? headline}
      className="relative mt-10 overflow-hidden border border-border"
      style={{ height: "clamp(160px, 22vw, 240px)", boxShadow: "var(--shadow-3)" }}
    >
      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full select-none object-cover"
        draggable={false}
      />
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
