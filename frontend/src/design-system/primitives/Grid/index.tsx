import * as React from "react";
import { cn } from "../../../utils/cn";

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "Grid Placeholder"}
      </div>
    );
  }
);
Grid.displayName = "Grid";
