import * as React from "react";
import { cn } from "../../../utils/cn";

export interface SplitLayoutProps extends React.HTMLAttributes<HTMLDivElement> {}

export const SplitLayout = React.forwardRef<HTMLDivElement, SplitLayoutProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "SplitLayout Placeholder"}
      </div>
    );
  }
);
SplitLayout.displayName = "SplitLayout";
