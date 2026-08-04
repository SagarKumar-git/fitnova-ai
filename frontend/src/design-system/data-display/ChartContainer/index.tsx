import * as React from "react";
import { cn } from "../../../utils/cn";

export interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "ChartContainer Placeholder"}
      </div>
    );
  }
);
ChartContainer.displayName = "ChartContainer";
