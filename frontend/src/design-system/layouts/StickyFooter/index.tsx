import * as React from "react";
import { cn } from "../../../utils/cn";

export interface StickyFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const StickyFooter = React.forwardRef<HTMLDivElement, StickyFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "StickyFooter Placeholder"}
      </div>
    );
  }
);
StickyFooter.displayName = "StickyFooter";
