import * as React from "react";
import { cn } from "../../../utils/cn";

export interface ChartWrappersProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ChartWrappers = React.forwardRef<HTMLDivElement, ChartWrappersProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "ChartWrappers Placeholder"}
      </div>
    );
  }
);
ChartWrappers.displayName = "ChartWrappers";
