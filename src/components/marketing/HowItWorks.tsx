const items = [
  {
    n: "01",
    t: "Cadence",
    d: "Markdown rhythm by house — when each maison historically softens, and how deeply.",
  },
  {
    n: "02",
    t: "Inventory",
    d: "Availability and scarcity movement — size runs thinning, quiet restocks, depth by category.",
  },
  {
    n: "03",
    t: "Market",
    d: "Seasonal timing and category signals — what peers and stockists are previewing this week.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="mx-auto w-full max-w-6xl scroll-mt-24 border-t border-border px-5 py-20 md:px-10 md:py-28"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">What it tracks</p>
          <h2 className="mt-4 font-serif text-3xl leading-tight md:text-5xl">
            Three quiet reads of the market.
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          The Get watches the patterns brands hope you won't notice — and tells you, gently, when to
          act.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-12">
        {items.map((s) => (
          <div key={s.n}>
            <p className="font-serif text-4xl text-muted-foreground">{s.n}</p>
            <h3 className="mt-5 font-serif text-2xl">{s.t}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
