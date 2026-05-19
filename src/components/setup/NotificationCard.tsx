import { Switch } from "@/components/ui/switch";

interface NotificationCardProps {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}

export function NotificationCard({
  title,
  description,
  checked,
  onCheckedChange,
}: NotificationCardProps) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-6 border border-border bg-card px-5 py-5 transition-colors hover:border-foreground/30">
      <div className="min-w-0">
        <p className="font-serif text-xl leading-tight">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} className="mt-1 shrink-0" />
    </label>
  );
}
