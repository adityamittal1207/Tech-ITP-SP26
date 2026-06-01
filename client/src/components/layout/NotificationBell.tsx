import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, AlertTriangle, UserPlus, MessageSquare, Mail } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "@/hooks/use-studio-data";
import { cn } from "@/lib/utils";

const iconFor: Record<string, typeof Bell> = {
  alert: AlertTriangle,
  signup: UserPlus,
  comms: MessageSquare,
  message: Mail,
};

export function NotificationBell() {
  const { data } = useNotifications();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const items = (data?.items ?? []).filter((i) => !dismissed.includes(i.id));
  const count = items.length;

  const handleSelect = (id: string, route: string) => {
    setDismissed((d) => [...d, id]);
    setOpen(false);
    navigate({ to: route as "/" | "/clients" | "/communications" | "/analytics" | "/settings" });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative h-9 w-9 rounded-lg border border-border bg-card flex items-center justify-center hover:bg-muted"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b border-border font-medium text-sm">Notifications</div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">All caught up</div>
          ) : (
            items.map((item) => {
              const Icon = iconFor[item.type] ?? Bell;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id, item.route)}
                  className="w-full text-left px-4 py-3 border-b border-border/60 last:border-0 hover:bg-muted/50 transition"
                >
                  <div className="flex gap-3">
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                      item.type === "alert" ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{item.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.subtitle}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{item.time}</div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
