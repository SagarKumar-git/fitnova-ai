import * as React from "react";
import { cn } from "../../../utils/cn";

export const FocusRing = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "absolute inset-0 rounded-inherit pointer-events-none transition-shadow",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className
        )}
        {...props}
      />
    );
  }
);
FocusRing.displayName = "FocusRing";
