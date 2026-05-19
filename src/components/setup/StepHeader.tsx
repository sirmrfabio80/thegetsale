interface StepHeaderProps {
  number: string;
  title: string;
  hint?: string;
}

export function StepHeader({ number, title, hint }: StepHeaderProps) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div className="flex items-baseline gap-4">
        <span className="eyebrow">{number}</span>
        <h2 className="font-serif text-2xl leading-tight md:text-3xl">{title}</h2>
      </div>
      {hint && <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{hint}</span>}
    </div>
  );
}
