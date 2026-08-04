import * as React from "react";
import { cn } from "../../../utils/cn";

export interface StatusIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {}

export const StatusIndicator = React.forwardRef<HTMLDivElement, StatusIndicatorProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "StatusIndicator Placeholder"}
      </div>
    );
  }
);
StatusIndicator.displayName = "StatusIndicator";
