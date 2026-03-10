import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[color:var(--mx-brand-500)] text-white hover:bg-[color:var(--mx-brand-600)]",
        secondary:
          "border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] text-[color:var(--mx-text)] hover:bg-[color:var(--mx-surface)]",
        ghost:
          "border border-transparent text-[color:var(--mx-text)] hover:border-[color:var(--mx-border)] hover:bg-[color:var(--mx-ghost-hover)]",
        danger: "bg-rose-700 text-white hover:bg-rose-800",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
