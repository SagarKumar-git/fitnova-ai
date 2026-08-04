import * as React from "react";
import { cn } from "../../../utils/cn";

export interface TooltipProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "Tooltip Placeholder"}
      </div>
    );
  }
);
Tooltip.displayName = "Tooltip";
