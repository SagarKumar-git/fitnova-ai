import * as React from "react";
import { cn } from "../../../utils/cn";

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "ScrollArea Placeholder"}
      </div>
    );
  }
);
ScrollArea.displayName = "ScrollArea";
