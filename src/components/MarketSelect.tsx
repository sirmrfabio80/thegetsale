import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  const selected = useMemo(() => MARKETS.find((m) => m.code === value) ?? null, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
        <Command>
          <CommandInput placeholder="Search markets…" className="h-10" />
          <CommandList>
            <CommandEmpty>No market found.</CommandEmpty>
            <CommandGroup>
              {MARKETS.map((m) => (
                <CommandItem
                  key={m.code}
                  value={`${m.label} ${m.code}`}
                  onSelect={() => {
                    onChange(m.code);
                    setOpen(false);
                  }}
                  className="cursor-pointer rounded-none"
                >
                  <span aria-hidden className="mr-2 text-base leading-none">
                    {m.flag}
                  </span>
                  <span className="flex-1">{m.label}</span>
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4",
                      value === m.code ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
