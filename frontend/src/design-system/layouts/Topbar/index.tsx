import * as React from "react";
import { cn } from "../../../utils/cn";

export interface TopbarProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Topbar = React.forwardRef<HTMLDivElement, TopbarProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children || "Topbar Placeholder"}
      </div>
    );
  }
);
Topbar.displayName = "Topbar";
