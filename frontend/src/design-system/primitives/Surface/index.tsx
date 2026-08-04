import * as React from "react";
import { cn } from "../../../utils/cn";
import { cva, type VariantProps } from "class-variance-authority";

const surfaceVariants = cva("bg-card text-card-foreground", {
  variants: {
    elevation: {
      none: "shadow-none",
      sm: "shadow-sm",
      md: "shadow-md",
      lg: "shadow-lg",
    },
    radius: {
      none: "rounded-none",
      sm: "rounded-sm",
      md: "rounded-md",
      lg: "rounded-lg",
      full: "rounded-full",
    },
    glass: {
      true: "bg-background/60 backdrop-blur-xl border border-border/50",
      false: "border",
    }
  },
  defaultVariants: {
    elevation: "sm",
    radius: "md",
    glass: false,
  },
});

export interface SurfaceProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof surfaceVariants> {}

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, elevation, radius, glass, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(surfaceVariants({ elevation, radius, glass, className }))}
        {...props}
      />
    );
  }
);
Surface.displayName = "Surface";
