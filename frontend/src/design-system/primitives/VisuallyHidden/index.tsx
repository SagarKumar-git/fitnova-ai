import * as React from "react";
import { cn } from "../../../utils/cn";

export const VisuallyHidden = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "absolute w-[1px] h-[1px] p-0 -m-[1px] overflow-hidden whitespace-nowrap border-0 clip-[rect(0,0,0,0)]",
          className
        )}
        {...props}
      />
    );
  }
);
VisuallyHidden.displayName = "VisuallyHidden";
