import * as React from "react";
import { cn } from "../../../utils/cn";

export interface ProgressLoaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ProgressLoader = React.forwardRef<HTMLDivElement, ProgressLoaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "ProgressLoader Placeholder"}
      </div>
    );
  }
);
ProgressLoader.displayName = "ProgressLoader";
