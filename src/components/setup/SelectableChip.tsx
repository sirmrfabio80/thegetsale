import { cn } from "@/lib/utils";

interface SelectableChipProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
}

export function SelectableChip({ label, selected, onToggle }: SelectableChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-[44px] items-center justify-center border px-4 py-2 text-sm transition-colors",
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
