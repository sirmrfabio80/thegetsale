import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Globe, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MARKETS, type MarketCode } from "@/lib/markets";

type Props = {
  value: MarketCode | null;
  onChange: (value: MarketCode) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
};

export function MarketSelect({
  value,
  onChange,
  placeholder = "Select your market",
  disabled,
  className,
  id,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = useMemo(() => MARKETS.find((m) => m.code === value) ?? null, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MARKETS;
    return MARKETS.filter(
      (m) => m.label.toLowerCase().includes(q) || m.code.includes(q),
    );
  }, [query]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-12 w-full justify-between rounded-none border border-foreground bg-background px-4 text-sm font-normal text-foreground hover:bg-background focus-visible:ring-1 focus-visible:ring-foreground focus-visible:ring-offset-0 disabled:opacity-60",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {selected ? (
              <>
                <span aria-hidden className="text-base leading-none">
                  {selected.flag}
                </span>
                <span className="truncate">{selected.label}</span>
              </>
            ) : (
              <>
                <Globe className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span>{placeholder}</span>
              </>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] rounded-none border border-foreground p-0"
        align="start"
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search markets…"
            className="h-8 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-xs text-muted-foreground">
              No market found.
            </li>
          ) : (
            filtered.map((m) => {
              const isSelected = value === m.code;
              return (
                <li key={m.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(m.code);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted focus:bg-muted focus:outline-none",
                      isSelected && "bg-muted",
                    )}
                  >
                    <span aria-hidden className="text-base leading-none">
                      {m.flag}
                    </span>
                    <span className="flex-1 truncate">{m.label}</span>
                    <Check
                      className={cn(
                        "ml-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                      aria-hidden
                    />
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
