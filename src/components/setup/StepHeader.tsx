interface StepHeaderProps {
  number: string;
  title: string;
  hint?: string;
  onReset?: () => void;
  canReset?: boolean;
}

export function StepHeader({ number, title, hint, onReset, canReset }: StepHeaderProps) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div className="flex items-baseline gap-4">
        <span className="eyebrow">{number}</span>
        <h2 className="font-serif text-2xl leading-tight md:text-3xl">{title}</h2>
      </div>
      <div className="flex items-baseline gap-4">
        {hint && (
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {hint}
          </span>
        )}
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            disabled={!canReset}
            className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground hover:underline underline-offset-4 disabled:opacity-40 disabled:hover:no-underline disabled:hover:text-muted-foreground disabled:cursor-not-allowed"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
