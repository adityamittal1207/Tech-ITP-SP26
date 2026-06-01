import type { ReactNode } from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { cn } from "@/lib/utils";

export function ExplainTerm({ text, children }: { text: string; children: ReactNode }) {
  return (
    <HoverCardPrimitive.Root openDelay={0} closeDelay={100}>
      <HoverCardPrimitive.Trigger asChild>
        <span
          className={cn(
            "inline cursor-help border-b-2 border-dotted border-foreground/45",
            "hover:border-foreground/80 transition-colors"
          )}
        >
          {children}
        </span>
      </HoverCardPrimitive.Trigger>
      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content
          side="top"
          sideOffset={8}
          className={cn(
            "z-50 max-w-72 rounded-md border border-border bg-popover p-3 text-popover-foreground",
            "text-xs leading-relaxed shadow-md outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          {text}
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  );
}
