import * as React from "react";
import { cn } from "../../../utils/cn";

export interface MetricProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Metric = React.forwardRef<HTMLDivElement, MetricProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "Metric Placeholder"}
      </div>
    );
  }
);
Metric.displayName = "Metric";
