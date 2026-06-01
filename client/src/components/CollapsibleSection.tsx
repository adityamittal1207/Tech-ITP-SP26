import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type CollapsibleSectionProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  defaultOpen?: boolean;
  headerAside?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = true,
  headerAside,
  children,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn("rounded-2xl border border-border bg-card shadow-soft", className)}
    >
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start">
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-start gap-2 text-left group">
          <ChevronDown
            className={cn(
              "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open ? "rotate-0" : "-rotate-90"
            )}
          />
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </CollapsibleTrigger>
        {headerAside && open && (
          <div className="shrink-0 sm:ml-auto" onClick={(e) => e.stopPropagation()}>
            {headerAside}
          </div>
        )}
      </div>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="px-5 pb-5 pt-0">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
