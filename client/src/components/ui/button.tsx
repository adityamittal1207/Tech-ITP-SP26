import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer select-none transition-[color,background-color,border-color,transform,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/75 active:shadow-none",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:bg-destructive/80 active:shadow-none",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground active:bg-muted active:border-border",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:bg-muted active:shadow-none",
        ghost: "hover:bg-accent hover:text-accent-foreground active:bg-muted",
        link: "text-primary underline-offset-4 hover:underline active:scale-100 active:opacity-80",
        chip:
          "border border-border bg-muted/70 text-foreground shadow-sm hover:bg-muted active:bg-border active:shadow-none active:scale-[0.96]",
        chipDestructive:
          "border border-destructive/25 bg-destructive/10 text-destructive shadow-sm hover:bg-destructive/15 active:bg-destructive/25 active:border-destructive/40 active:shadow-none active:scale-[0.96]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        xs: "h-6 rounded-md px-2 text-[10px] font-medium leading-none",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
        iconSm: "h-8 w-8 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
