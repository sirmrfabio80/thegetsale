import type { ReactNode } from "react";

type Props = {
  title: string;
  count?: number;
  onEdit: () => void;
  children: ReactNode;
};

export function ReviewRow({ title, count, onEdit, children }: Props) {
  return (
    <div className="border-t border-border py-6">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h3 className="font-serif text-xl">{title}</h3>
          {typeof count === "number" && (
            <span className="text-xs text-muted-foreground">{count}</span>
          )}
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
        >
          Edit
        </button>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
