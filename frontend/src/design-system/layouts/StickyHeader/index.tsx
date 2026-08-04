import * as React from "react";
import { cn } from "../../../utils/cn";

export interface StickyHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const StickyHeader = React.forwardRef<HTMLDivElement, StickyHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "StickyHeader Placeholder"}
      </div>
    );
  }
);
StickyHeader.displayName = "StickyHeader";
